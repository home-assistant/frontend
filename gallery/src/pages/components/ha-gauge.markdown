---
title: Gauge
---

<style>
  ha-gauge {
    display: block;
    width: 200px;
    margin-top: 15px;
    margin-bottom: 50px;
  }
</style>

# Gauge `<ha-gauge>`

A gauge that can be used to represent sensor data and provide visual feedback about the value and the corresponding severity (success, warning, error).

## Examples

Info color gauge
<ha-gauge value="75" style="--gauge-color: var(--info-color)"></ha-gauge>

Success color gauge
<ha-gauge value="25" style="--gauge-color: var(--success-color)" label="°C"></ha-gauge>

Warning color gauge
<ha-gauge value="50" style="--gauge-color: var(--warning-color)" label="°C"></ha-gauge>

Error color gauge
<ha-gauge value="75" style="--gauge-color: var(--error-color)" label="°C"></ha-gauge>

Gauge with background color
<ha-gauge value="75" style="--gauge-color: var(--info-color); --primary-background-color: lightgray"></ha-gauge>

## CSS variables

### Gauge

`primary-background-color`  
Background color of the dial (rounded arch)

`primary-text-color`  
Text color below dial (value and unit of measurement) plus needle color (if gauge is in needle mode)

#### Dial colors

`gauge-color`  
Used in the coding to control what color the gauge value is rendered with, but cannot be set via theme since its value will dynamically be set (either to `info-color` or to the matching severity variable if the severity color mode is used). To control the used colors, adjust the following variables.

`success-color`  
Dial color for the "green" severity level

`warning-color`  
Dial color for the "yellow" severity level

`error-color`  
Dial color for the "red" severity level

`info-color`  
Static dial color if not in severity color mode
