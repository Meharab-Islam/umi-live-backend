import React, { useEffect } from "react";
import anime from "animejs";

export default function WheeSpin(props) {
  return (
    <div className="wheel-page">
      <div class="roulette-wheel">
        <div class="layer-2 wheel" style={{ transform: " rotate(0deg)" }}></div>
        <div class="layer-3"></div>
        <div class="layer-4 wheel" style={{ transform: " rotate(0deg)" }}></div>
        <div class="layer-5"></div>
        <div class="ball-container" style={{ transform: " rotate(0deg)" }}>
          <div
            class="ball"
            style={{ transform: " translate(0, -163.221px)" }}
          ></div>
        </div>
        <svg>
          <circle
            cx="190"
            cy="190"
            r="190"
            style={{ touchAction: "none" }}
          ></circle>
        </svg>
      </div>
    </div>
  );
}
