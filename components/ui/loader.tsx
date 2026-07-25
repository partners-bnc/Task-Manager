"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export const Component = () => {
  return (
    <div className="wrapper-grid">
      <div className="cube">
        <div className="face face-front">L</div>
        <div className="face face-back"></div>
        <div className="face face-right"></div>
        <div className="face face-left"></div>
        <div className="face face-top"></div>
        <div className="face face-bottom"></div>
      </div>

      <div className="cube">
        <div className="face face-front">O</div>
        <div className="face face-back"></div>
        <div className="face face-right"></div>
        <div className="face face-left"></div>
        <div className="face face-top"></div>
        <div className="face face-bottom"></div>
      </div>

      <div className="cube">
        <div className="face face-front">A</div>
        <div className="face face-back"></div>
        <div className="face face-right"></div>
        <div className="face face-left"></div>
        <div className="face face-top"></div>
        <div className="face face-bottom"></div>
      </div>

      <div className="cube">
        <div className="face face-front">D</div>
        <div className="face face-back"></div>
        <div className="face face-right"></div>
        <div className="face face-left"></div>
        <div className="face face-top"></div>
        <div className="face face-bottom"></div>
      </div>

      <div className="cube">
        <div className="face face-front">I</div>
        <div className="face face-back"></div>
        <div className="face face-right"></div>
        <div className="face face-left"></div>
        <div className="face face-top"></div>
        <div className="face face-bottom"></div>
      </div>

      <div className="cube">
        <div className="face face-front">N</div>
        <div className="face face-back"></div>
        <div className="face face-right"></div>
        <div className="face face-left"></div>
        <div className="face face-top"></div>
        <div className="face face-bottom"></div>
      </div>

      <div className="cube">
        <div className="face face-front">G</div>
        <div className="face face-back"></div>
        <div className="face face-right"></div>
        <div className="face face-left"></div>
        <div className="face face-top"></div>
        <div className="face face-bottom"></div>
      </div>
    </div>
  );
};

export const Loader = Component;
export default Component;
