"use client";

import React from 'react';
import BackToHomeButton from '@/components/common/back-to-home-button';

export default function BusinessIntelligencePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <BackToHomeButton />
        <h1 className="text-2xl font-bold">İş Zekası</h1>
      </div>
      <div className="text-muted-foreground">Bu sayfa boş bırakıldı.</div>
    </div>
  );
}
