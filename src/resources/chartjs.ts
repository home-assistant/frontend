import ZoomPlugin from "chartjs-plugin-zoom";
import {
  LineController,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  CategoryScale,
  Chart,
  BarElement,
  BarController,
  LogarithmicScale,
} from "chart.js";
import { TextBarElement } from "../components/chart/timeline-chart/textbar-element";
import { TimelineController } from "../components/chart/timeline-chart/timeline-controller";
import "../components/chart/chart-date-adapter";

export { Chart } from "chart.js";

Chart.register(
  Tooltip,
  Title,
  Legend,
  Filler,
  TimeScale,
  LinearScale,
  LineController,
  BarController,
  BarElement,
  PointElement,
  LineElement,
  TextBarElement,
  TimelineController,
  CategoryScale,
  LogarithmicScale,
  ZoomPlugin
);
