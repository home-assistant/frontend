//MapLibre GL custom layer for the weather-mode cloud overlay. Three full-bbox quads
//(low/mid/high cloud bands) rendered by a fragment shader that samples a tiny RGBA
//data texture (R/G/B = low/mid/high coverage) at each fragment's geographic position,
//multiplies it by 4-octave simplex FBM noise for the "shredded cloud" look, and emits
//a soft-edged shape in --primary-text-color at per-band opacity (0.20/0.40/0.60). All
//three bands share one texture, so a timeline scrub re-uploads ~400 bytes.

import type {
  CustomLayerInterface,
  Map as MaplibreMap,
  CustomRenderMethodInput,
} from "maplibre-gl";

export interface WeatherCloudLayerOptions {
  color: [number, number, number]; //--primary-text-color RGB, 0..1
  gridSide: number; //N
  bbox: { west: number; south: number; east: number; north: number };
  cloudLow: Float32Array; //N*N values, 0..100 (% cloud cover)
  cloudMid: Float32Array;
  cloudHigh: Float32Array;
  bandsVisible: [boolean, boolean, boolean]; //low, mid, high
}

//Per-band alpha multiplier on top of the shaped cloud density; growing weight from low
//to high so a fully overcast stack reads as a heavy ceiling, not three identical greys.
const BAND_OPACITY = [0.2, 0.4, 0.6] as const;

//Vertex shader. Mercator coords go straight through mainMatrix to clip space; the
//geographic lon/lat passes as a separate attribute so the fragment shader samples the
//data texture and noise by location (zoom/pan/rotate invariant).
const VERT_SRC = `
precision highp float;
attribute vec3 a_pos;
attribute vec2 a_geo;
uniform mat4 u_matrix;
varying vec2 v_geo;
void main()
{
    gl_Position = u_matrix * vec4(a_pos, 1.0);
    v_geo = a_geo;
}
`;

//Fragment shader. Threshold-based cloud carving: the FBM noise field defines WHERE
//clouds could be, the sampled coverage shifts the smoothstep threshold so noise stays
//visible at any coverage. Per-band scale + phase give the three altitudes distinct
//signatures (low = tight cumulus, high = broad cirrus). Output is premultiplied alpha.
//Mobile-driver hardening: u_bandIndex is a float (int ternaries misbehave on some
//Adreno/Mali), u_time is wrapped to [0, 3600) host-side for FP24 precision, and
//out-of-bounds/edge-faded fragments discard before the FBM call.
//Simplex noise: Ashima Arts' canonical 2D implementation, public domain.
const FRAG_SRC = `
precision highp float;

uniform sampler2D u_dataTexture;
uniform float     u_bandIndex;   //0.0 = low, 1.0 = mid, 2.0 = high (float for driver safety)
uniform vec3      u_color;
uniform float     u_opacity;
uniform float     u_time;        //seconds since layer mount, wrapped mod 3600 host-side
uniform vec4      u_bbox;        //west, south, east, north
uniform float     u_latCos;      //cos(radians(centre_lat)), undoes Mercator lon stretching
varying vec2      v_geo;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v)
{
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                        + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x  = 2.0 * fract(p * C.www) - 1.0;
    vec3 h  = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p, float t)
{
    float v = 0.0;
    float a = 0.5;
    vec2  shift = vec2(100.0);
    for (int i = 0; i < 4; i++)
    {
        v += a * snoise(p + t * 0.02);
        p  = p * 2.0 + shift;
        a *= 0.5;
        t *= 0.7;
    }
    return v;
}

void main()
{
    //Geographic UV inside the bbox; CLAMP_TO_EDGE extends edge cells past the bbox.
    vec2 uv = vec2(
        (v_geo.x - u_bbox.x) / (u_bbox.z - u_bbox.x),
        (v_geo.y - u_bbox.y) / (u_bbox.w - u_bbox.y)
    );

    //Early discard outside the quad bbox to skip the FBM compute.
    if (uv.x < -0.01 || uv.x > 1.01 || uv.y < -0.01 || uv.y > 1.01) { discard; }

    //Edge fade, computed up front so a near-zero factor short-circuits the FBM.
    float edgeFade = smoothstep(0.0, 0.10, uv.x) * smoothstep(1.0, 0.90, uv.x)
                   * smoothstep(0.0, 0.10, uv.y) * smoothstep(1.0, 0.90, uv.y);
    if (edgeFade <= 0.001) { discard; }

    vec4 dataSample = texture2D(u_dataTexture, uv);
    float coverage = (u_bandIndex < 0.5) ? dataSample.r
                   : (u_bandIndex < 1.5) ? dataSample.g
                                         : dataSample.b;

    //Latitude correction: scale x by cos(lat) to undo Mercator's longitude stretch so
    //cloud features aren't elongated east-west.
    vec2 noiseSpace = vec2(v_geo.x * u_latCos, v_geo.y);

    //Per-band scale (low = tight puffs, high = broad sheets) + phase offset so a fully
    //overcast point shows three distinct shapes rather than three identical greys.
    float scale = mix(28.0, 14.0, u_bandIndex * 0.5);   //low=28, mid=21, high=14 cycles / deg
    float phase = u_bandIndex * 137.5;

    float noise = fbm(noiseSpace * scale + vec2(phase), u_time);
    noise = clamp(noise * 0.5 + 0.5, 0.0, 1.0);

    //Cloud carving: coverage drives the threshold (0 -> 0.90 mostly dark, 1 -> 0.10
    //mostly full); the wide smoothstep keeps noise relief visible even when overcast.
    float threshold = 1.0 - coverage * 0.8 - 0.10;
    float density   = smoothstep(threshold - 0.10, threshold + 0.35, noise);

    float alpha = density * u_opacity * edgeFade;

    //Premultiplied alpha to match the host's ONE / ONE_MINUS_SRC_ALPHA blend func.
    gl_FragColor = vec4(u_color * alpha, alpha);
}
`;

//Web Mercator projection (lng/lat -> [0,1]^2), matching MapLibre's internal convention.
function lngLatToMercator(lng: number, lat: number): [number, number] {
  const x = lng / 360 + 0.5;
  const y =
    0.5 -
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);
  return [x, y];
}

export class WeatherCloudLayer implements CustomLayerInterface {
  public id = "sol-weather-cloud";
  public type = "custom" as const;
  public renderingMode = "2d" as const;

  private map: MaplibreMap | null = null;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private dataTexture: WebGLTexture | null = null;

  private aPos = -1;
  private aGeo = -1;
  private uMatrix: WebGLUniformLocation | null = null;
  private uDataTexture: WebGLUniformLocation | null = null;
  private uBandIndex: WebGLUniformLocation | null = null;
  private uColor: WebGLUniformLocation | null = null;
  private uOpacity: WebGLUniformLocation | null = null;
  private uTime: WebGLUniformLocation | null = null;
  private uBbox: WebGLUniformLocation | null = null;
  private uLatCos: WebGLUniformLocation | null = null;

  private opts: WeatherCloudLayerOptions;
  private startMs: number = performance.now();
  //cos(centre_lat) cached so render() is one uniform write, not a trig call per frame.
  private latCosCached = 1;

  constructor(opts: WeatherCloudLayerOptions) {
    this.opts = {
      ...opts,
      bandsVisible: [...opts.bandsVisible] as [boolean, boolean, boolean],
    };
    this._cacheLatitudeCos();
  }

  private _cacheLatitudeCos(): void {
    const centreLat = (this.opts.bbox.south + this.opts.bbox.north) / 2;
    this.latCosCached = Math.cos((centreLat * Math.PI) / 180);
  }

  public onAdd(map: MaplibreMap, gl: WebGLRenderingContext): void {
    this.map = map;
    this.gl = gl;
    this._compileProgram();
    this._uploadGeometry();
    this._uploadDataTexture();
  }

  public onRemove(): void {
    const gl = this.gl;
    if (gl) {
      if (this.program) {
        gl.deleteProgram(this.program);
      }
      if (this.vertexBuffer) {
        gl.deleteBuffer(this.vertexBuffer);
      }
      if (this.dataTexture) {
        gl.deleteTexture(this.dataTexture);
      }
    }
    this.program = null;
    this.vertexBuffer = null;
    this.dataTexture = null;
    this.gl = null;
    this.map = null;
  }

  //MapLibre 5 hands us either a Float32Array (legacy) or an object with
  //defaultProjectionData.mainMatrix; sniff the typed-array shape, else the object path.
  public render(
    gl: WebGLRenderingContext,
    args: Float32Array | CustomRenderMethodInput
  ): void {
    if (!this.program || !this.vertexBuffer || !this.dataTexture) {
      return;
    }
    //MapLibre's `mat4` typing is wider than gl.uniformMatrix4fv accepts, so copy into a
    //fresh Float32Array (16 floats/frame is negligible).
    let matrix: Float32Array | null = null;
    if (ArrayBuffer.isView(args)) {
      matrix = args as Float32Array;
    } else {
      const m = (args as CustomRenderMethodInput)?.defaultProjectionData
        ?.mainMatrix as ArrayLike<number> | undefined;
      if (m) {
        matrix = Float32Array.from(m);
      }
    }
    if (!matrix) {
      return;
    }

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
    gl.uniform1i(this.uDataTexture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 5 * 4, 0);
    gl.enableVertexAttribArray(this.aGeo);
    gl.vertexAttribPointer(this.aGeo, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

    gl.uniformMatrix4fv(this.uMatrix, false, matrix);
    gl.uniform3f(
      this.uColor,
      this.opts.color[0],
      this.opts.color[1],
      this.opts.color[2]
    );
    gl.uniform4f(
      this.uBbox,
      this.opts.bbox.west,
      this.opts.bbox.south,
      this.opts.bbox.east,
      this.opts.bbox.north
    );
    gl.uniform1f(this.uLatCos, this.latCosCached);
    //Wrap elapsed seconds at 3600 so the time uniform stays within FP24 precision on
    //mobile GPUs; the drift step is small enough that the wrap is invisible.
    const elapsedSec = (performance.now() - this.startMs) / 1000;
    gl.uniform1f(this.uTime, elapsedSec % 3600);

    gl.enable(gl.BLEND);
    //Premultiplied-alpha blend; the fragment shader already scaled u_color by alpha.
    //SRC_ALPHA / ONE_MINUS_SRC_ALPHA here would double-blend to flat colour.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    //Paint low -> mid -> high so the more opaque band sits on top. Band index as a float
    //avoids int-precision pitfalls in the fragment-shader ternaries on mobile drivers.
    const order = [0, 1, 2] as const;
    for (const band of order) {
      if (!this.opts.bandsVisible[band]) {
        continue;
      }
      gl.uniform1f(this.uBandIndex, band);
      gl.uniform1f(this.uOpacity, BAND_OPACITY[band]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    //Schedule the next frame for the slow drift; MapLibre coalesces repaint requests.
    this.map?.triggerRepaint();
  }

  public updateData(patch: Partial<WeatherCloudLayerOptions>): void {
    let needTexture = false;
    let needGeometry = false;
    if (patch.cloudLow) {
      this.opts.cloudLow = patch.cloudLow;
      needTexture = true;
    }
    if (patch.cloudMid) {
      this.opts.cloudMid = patch.cloudMid;
      needTexture = true;
    }
    if (patch.cloudHigh) {
      this.opts.cloudHigh = patch.cloudHigh;
      needTexture = true;
    }
    if (patch.gridSide) {
      this.opts.gridSide = patch.gridSide;
      needTexture = true;
    }
    if (patch.bbox) {
      this.opts.bbox = patch.bbox;
      needGeometry = true;
      this._cacheLatitudeCos();
    }
    if (patch.color) {
      this.opts.color = patch.color;
    }
    if (patch.bandsVisible) {
      this.opts.bandsVisible = [...patch.bandsVisible] as [
        boolean,
        boolean,
        boolean,
      ];
    }
    if (this.gl) {
      if (needTexture) {
        this._uploadDataTexture();
      }
      if (needGeometry) {
        this._uploadGeometry();
      }
    }
    this.map?.triggerRepaint();
  }

  //----------------------------------------------------------- internals

  private _compileProgram(): void {
    const gl = this.gl!;
    const vs = this._compileShader(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = gl.createProgram();
    if (!program) {
      throw new Error("weather-cloud-layer: failed to create program");
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`weather-cloud-layer: link failed: ${log}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    this.program = program;
    this.aPos = gl.getAttribLocation(program, "a_pos");
    this.aGeo = gl.getAttribLocation(program, "a_geo");
    this.uMatrix = gl.getUniformLocation(program, "u_matrix");
    this.uDataTexture = gl.getUniformLocation(program, "u_dataTexture");
    this.uBandIndex = gl.getUniformLocation(program, "u_bandIndex");
    this.uColor = gl.getUniformLocation(program, "u_color");
    this.uOpacity = gl.getUniformLocation(program, "u_opacity");
    this.uTime = gl.getUniformLocation(program, "u_time");
    this.uBbox = gl.getUniformLocation(program, "u_bbox");
    this.uLatCos = gl.getUniformLocation(program, "u_latCos");
  }

  private _compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl!;
    const sh = gl.createShader(type);
    if (!sh) {
      throw new Error("weather-cloud-layer: failed to create shader");
    }
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`weather-cloud-layer: shader compile failed: ${log}`);
    }
    return sh;
  }

  private _uploadGeometry(): void {
    const gl = this.gl!;
    const { west, south, east, north } = this.opts.bbox;
    //Quad as triangle strip (SW, SE, NW, NE). Each vertex stores 3 mercator coords +
    //2 lon/lat attributes for the fragment shader's texture sample and noise.
    const mercSW = lngLatToMercator(west, south);
    const mercSE = lngLatToMercator(east, south);
    const mercNW = lngLatToMercator(west, north);
    const mercNE = lngLatToMercator(east, north);
    const buffer = new Float32Array([
      mercSW[0],
      mercSW[1],
      0.0,
      west,
      south,
      mercSE[0],
      mercSE[1],
      0.0,
      east,
      south,
      mercNW[0],
      mercNW[1],
      0.0,
      west,
      north,
      mercNE[0],
      mercNE[1],
      0.0,
      east,
      north,
    ]);
    if (!this.vertexBuffer) {
      this.vertexBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
  }

  private _uploadDataTexture(): void {
    const gl = this.gl!;
    const N = this.opts.gridSide;
    if (
      this.opts.cloudLow.length < N * N ||
      this.opts.cloudMid.length < N * N ||
      this.opts.cloudHigh.length < N * N
    ) {
      return;
    }
    //Pack the 3 bands into R/G/B of an N x N RGBA8 texture; 8-bit quantisation of the
    //cloud-cover percent is plenty since the shader noise dominates at sub-percent scales.
    const px = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      const lo = this.opts.cloudLow[i];
      const mi = this.opts.cloudMid[i];
      const hi = this.opts.cloudHigh[i];
      px[i * 4 + 0] = Math.min(255, Math.max(0, lo * 2.55));
      px[i * 4 + 1] = Math.min(255, Math.max(0, mi * 2.55));
      px[i * 4 + 2] = Math.min(255, Math.max(0, hi * 2.55));
      px[i * 4 + 3] = 255;
    }
    if (!this.dataTexture) {
      this.dataTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
    }
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      N,
      N,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      px
    );
  }
}
