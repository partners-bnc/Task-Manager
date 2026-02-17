'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function Hero() {
  const { scrollY } = useScroll();

  const rotateX = useTransform(scrollY, [0, 700], [30, 0]);
  const scale = useTransform(scrollY, [0, 700], [0.85, 1]);
  const opacity = useTransform(scrollY, [0, 600], [0.5, 1]);
  const y = useTransform(scrollY, [0, 700], [100, 0]);

  return (
    <section className="relative pt-32 pb-16 md:pt-48 md:pb-32 px-4 overflow-hidden z-10">
      <div className="absolute inset-0 -z-10 w-full h-full pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, 
              #FFFFFF 0%,
              #FFF0F5 5%,
              #E0C3FC 20%,
              #C4B5FD 55%,
              #A78BFA 80%,
              #7C3AED 100%
            )`,
          }}
        />

        <motion.div
          className="absolute rounded-full blur-[100px]"
          style={{
            width: 600,
            height: 600,
            background:
              'radial-gradient(circle, #F0ABFC 0%, #A855F7 50%, transparent 70%)',
            top: '-10%',
            left: '10%',
          }}
          animate={{
            x: [0, 200, -150, 180, -80, 0],
            y: [0, 150, -120, 80, -160, 0],
            scale: [1, 1.4, 0.8, 1.3, 0.9, 1],
            opacity: [0.6, 0.8, 0.5, 0.9, 0.6, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute rounded-full blur-[90px]"
          style={{
            width: 500,
            height: 500,
            background:
              'radial-gradient(circle, #8B5CF6 0%, #6D28D9 50%, transparent 70%)',
            top: '15%',
            right: '5%',
          }}
          animate={{
            x: [0, -200, 160, -120, 80, 0],
            y: [0, -180, 140, -100, 170, 0],
            scale: [1, 1.35, 0.75, 1.3, 0.85, 1],
            opacity: [0.5, 0.8, 0.45, 0.7, 0.55, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute rounded-full blur-[70px]"
          style={{
            width: 400,
            height: 400,
            background:
              'radial-gradient(circle, #F472B6 0%, #EC4899 40%, transparent 70%)',
            top: '5%',
            left: '45%',
          }}
          animate={{
            x: [0, -180, 200, -140, 100, 0],
            y: [0, 160, -180, 120, -100, 0],
            scale: [1, 1.5, 0.7, 1.4, 0.8, 1],
            opacity: [0.5, 0.7, 0.4, 0.8, 0.5, 0.5],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute rounded-full blur-[110px]"
          style={{
            width: 700,
            height: 700,
            background:
              'radial-gradient(circle, #7C3AED 0%, #4C1D95 50%, transparent 70%)',
            bottom: '-15%',
            left: '25%',
          }}
          animate={{
            x: [0, 180, -200, 150, -100, 0],
            y: [0, -140, 120, -180, 80, 0],
            scale: [1, 1.3, 0.8, 1.25, 0.85, 1],
            opacity: [0.5, 0.75, 0.4, 0.7, 0.5, 0.5],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute rounded-full blur-[80px]"
          style={{
            width: 350,
            height: 350,
            background:
              'radial-gradient(circle, #DDD6FE 0%, #C4B5FD 40%, transparent 70%)',
            top: '-5%',
            right: '20%',
          }}
          animate={{
            x: [0, 150, -180, 120, -90, 0],
            y: [0, 130, -160, 100, -70, 0],
            scale: [1, 1.4, 0.75, 1.35, 0.85, 1],
            opacity: [0.45, 0.7, 0.35, 0.65, 0.45, 0.45],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-125 bg-white/50 blur-[120px] -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
        <Badge className="mb-8">Reduce your workload by 70%</Badge>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl mb-6">
         Simplify Internal Work at BNC Global
        </h1>

        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10">
          Ship Tasks faster, collaborate smarter, and achieve more with TaskSphere
          collaboration and success
        </p>

        <Button href="/dashboard" size="lg" className="mb-20 shadow-xl shadow-purple-500/20">
          Get Access
        </Button>

        <div style={{ perspective: '1000px' }}>
          <motion.div
            style={{
              rotateX,
              scale,
              opacity,
              y,
            }}
            className="w-full max-w-300 relative rounded-3xl overflow-hidden
                       shadow-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-2 md:p-4 will-change-transform"
          >
            <div className="rounded-2xl overflow-hidden bg-white shadow-inner">
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

            <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20 pointer-events-none" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
