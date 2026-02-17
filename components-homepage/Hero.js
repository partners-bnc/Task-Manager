'use client';

import Image from 'next/image';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function Hero() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-28 px-4 overflow-hidden z-10">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-10 w-full h-full pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              // UPDATED GRADIENT:
              // 0-20%: Distinct Pink for the header text
              // 40%: rapidly transitions to Purple
              // 60-100%: Deep Blue/Indigo dominates the lower half
              'linear-gradient(180deg, #FCE7F3 0%, #F0ABFC 20%, #8B5CF6 45%, #4C1D95 75%, #1E1B4B 100%)',
          }}
        />

        {/* Top Glow: Refined to enhance the pink at the very top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-[30%] bg-[#FBCFE8]/60 blur-[100px]" />

        {/* Bottom Glow: Deepened to match the extended blue/purple */}
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[#2E1065]/50 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="-mt-4 md:-mt-8 flex flex-col items-center text-center">
          {/* Badge: Added white background to pop against the pink */}
          <Badge className="mb-6 bg-white/70 backdrop-blur-md border-white/50 text-slate-800 shadow-sm">
            Reduce your workload by 70%
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl mb-6">
            Simplify Internal Work at BNC Global
          </h1>

          {/* Text Color: Darkened to slate-900 for better contrast on the darker pink/purple transition */}
          <p className="text-lg md:text-xl text-slate-900 max-w-2xl mb-8 font-medium">
            Ship Tasks faster, collaborate smarter, and achieve more with TaskSphere
            collaboration and success
          </p>

          <Button href="/dashboard" size="lg" className="mb-14 shadow-2xl shadow-violet-900/40 border border-white/20">
            Get Access
          </Button>
        </div>

        <div className="w-full max-w-[1160px] relative rounded-[28px] overflow-hidden border border-white/40 bg-white/20 p-2 md:p-3 shadow-[0_30px_100px_rgba(20,5,60,0.5)] backdrop-blur-sm">
          <div className="rounded-3xl overflow-hidden bg-[#f8f8fb]">
            <Image
              src="/assets/img.png"
              alt="Dashboard Preview"
              width={1600}
              height={900}
              sizes="(max-width: 1280px) 100vw, 1200px"
              priority
              className="w-full h-auto block"
            />
          </div>

          <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/50 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}