import Image from 'next/image';
import { Badge } from './ui/Badge';
import { MessageCircle, FileText, BarChart2, Layers } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Collaboration Hub',
    description:
      'Foster seamless communication with built-in chat, document sharing, and threaded discussions.',
    icon: MessageCircle,
    image:
      'https://framerusercontent.com/images/SocJXtmgXBgM16dug4bxu86cvQ.png',
    bg: 'bg-primary/10',
    color: 'text-primary',
  },
  {
    id: 2,
    title: 'Real-Time Progress Tracking',
    description:
      'Stay in the loop with live updates on project timelines, milestones, and completion percentages.',
    icon: BarChart2,
    image:
      'https://framerusercontent.com/images/GxG8v7SLA1Re5IF8BUD6neLI794.png',
    bg: 'bg-blue-100',
    color: 'text-blue-600',
  },
  {
    id: 3,
    title: 'Custom Workflows',
    description:
      'Tailor TaskSphere to match your unique project processes and workflow requirements.',
    icon: Layers,
    image:
      'https://framerusercontent.com/images/T8miZkCSYxNM5wL8ZRLPzCXBbU.png',
    bg: 'bg-green-100',
    color: 'text-green-600',
  },
  {
    id: 4,
    title: 'Intuitive Task Management',
    description:
      'Effortlessly assign, track, and manage tasks in a centralized workspace.',
    icon: FileText,
    image:
      'https://framerusercontent.com/images/iOonRscLRF7LzC203gHMZJ2Gew8.png',
    bg: 'bg-orange-100',
    color: 'text-orange-600',
  },
];

export function FeatureSteps() {
  return (
    <section className="py-20 px-4 bg-white overflow-hidden" id="about">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mb-24">
          <Badge className="mb-4">Why Choose Us</Badge>
          <h2 className="text-3xl md:text-5xl font-bold text-dark max-w-2xl">
            Elevate with Us, Choose Excellence Always
          </h2>
        </div>

        <div className="flex flex-col gap-24 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2 hidden md:block"></div>

          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`flex flex-col md:flex-row items-center gap-12 md:gap-24 relative ${
                idx % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-200 shadow-sm">
                <step.icon className={`w-6 h-6 ${step.color}`} />
              </div>

              <div className="flex-1 w-full text-center md:text-left">
                <div
                  className={`flex flex-col gap-4 ${
                    idx % 2 === 1 ? 'md:items-end md:text-right' : 'md:items-start'
                  }`}
                >
                  <Badge className="w-fit bg-transparent border-gray-200 text-gray-500">
                    {step.title}
                  </Badge>
                  <h3 className="text-2xl md:text-4xl font-bold text-dark">
                    {step.description}
                  </h3>

                  <div
                    className={`md:hidden flex items-center gap-2 mt-4 ${step.color} bg-gray-50 w-fit px-3 py-1 rounded-full`}
                  >
                    <step.icon size={16} />
                    <span className="text-sm font-medium">Feature {step.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full">
                <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-gray-50 aspect-[4/3] group hover:shadow-xl transition-shadow duration-300">
                  <div className={`absolute inset-0 ${step.bg} opacity-20`}></div>
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-top transform group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
