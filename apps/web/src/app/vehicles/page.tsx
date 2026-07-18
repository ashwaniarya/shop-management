'use client';

import { useState } from 'react';

import { VehicleClassesPanel } from '@/components/admin/vehicles/VehicleClassesPanel';
import { VehicleMakesPanel } from '@/components/admin/vehicles/VehicleMakesPanel';
import { VehicleModelsPanel } from '@/components/admin/vehicles/VehicleModelsPanel';

type VehicleTabKey = 'classes' | 'makes' | 'models';

const TABS: { key: VehicleTabKey; label: string }[] = [
  { key: 'classes', label: 'Classes' },
  { key: 'makes', label: 'Makes' },
  { key: 'models', label: 'Models' },
];

export default function VehiclesPage() {
  const [activeTab, setActiveTab] = useState<VehicleTabKey>('classes');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Vehicles</h1>
        <p className="mt-1 text-sm text-ink-500">Classes, makes and models used across fitments and the parts catalog.</p>
      </div>

      <div>
        <div role="tablist" aria-label="Vehicle catalog sections" className="flex gap-1 overflow-x-auto border-b border-ink-800">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              type="button"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px shrink-0 rounded-t-sm border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-ink-50'
                  : 'border-transparent text-ink-500 hover:text-ink-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="pt-5">
          {activeTab === 'classes' ? <VehicleClassesPanel /> : activeTab === 'makes' ? <VehicleMakesPanel /> : <VehicleModelsPanel />}
        </div>
      </div>
    </div>
  );
}
