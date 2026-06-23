import "./reset.css";
import "./styles.css";
import { initCursorCube } from "./cursor-cube";
import { initStarfield } from "./starfield";

const starfield = document.getElementById("starfield");
if (starfield) initStarfield(starfield);

const cursorCube = document.getElementById("cursor-cube");
if (cursorCube) initCursorCube(cursorCube);
