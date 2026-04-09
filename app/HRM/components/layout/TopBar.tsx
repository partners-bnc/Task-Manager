'use client';

import React from 'react';

interface TopBarProps {
  title?: string;
}

export default function TopBar({ title }: TopBarProps) {
  if (!title) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md w-full h-20 px-12 flex items-center">
      <div>
        {title && <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-background">{title}</h1>}
      </div>
    </header>
  );
}
