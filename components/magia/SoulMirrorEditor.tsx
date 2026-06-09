'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SoulMirrorItem, SoulMirrorType, ElementType, WorkMethod } from '@/lib/magia-types';

interface SoulMirrorEditorProps {
  userId: string;
  showWorkMethods?: boolean;
}

const ELEMENT_LABELS: Record<ElementType, string> = {
  tuz: '🔥 Tűz',
  levego: '💨 Levegő',
  viz: '💧 Víz',
  fold: '🌍 Föld',
};

const INTENSITY_LABELS = ['', '●', '●●', '●●●'] as const;
const INTENSITY_TITLES = ['', 'Gyenge', 'Közepes', 'Erős'];

const WORK_METHOD_LABELS: Record<WorkMethod, string> = {
  uralas: 'Uralás',
  autoszuggeszcio: 'Autoszuggesztió',
  transzmutacio: 'Transzmutáció',
};

const BLANK_ITEM = { trait: '', element: '' as ElementType | '', intensity: 1 as 1 | 2 | 3 };

export function SoulMirrorEditor({ userId, showWorkMethods = false }: SoulMirrorEditorProps) {
  const [items, setItems] = useState<SoulMirrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SoulMirrorType>('fekete');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState(BLANK_ITEM);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('magia_soul_mirror')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    setItems((data ?? []) as SoulMirrorItem[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async () => {
    if (!newItem.trait.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('magia_soul_mirror')
      .insert({
        user_id: userId,
        mirror: activeTab,
        trait: newItem.trait.trim(),
        element: newItem.element || null,
        intensity: newItem.intensity,
      })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      setItems((prev) => [...prev, data as SoulMirrorItem]);
      setNewItem(BLANK_ITEM);
      setShowAddForm(false);
    }
  };

  const toggleResolved = async (item: SoulMirrorItem) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('magia_soul_mirror')
      .update({ resolved: !item.resolved, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single();
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === data.id ? (data as SoulMirrorItem) : i)));
    }
  };

  const setWorkMethod = async (item: SoulMirrorItem, method: WorkMethod | null) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('magia_soul_mirror')
      .update({ work_method: method, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .select()
      .single();
    if (data) {
      setItems((prev) => prev.map((i) => (i.id === data.id ? (data as SoulMirrorItem) : i)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Törölni szeretnéd ezt a tételt?')) return;
    const supabase = createClient();
    await supabase.from('magia_soul_mirror').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const tabItems = items.filter((i) => i.mirror === activeTab);

  const ELEMENT_COLORS: Record<ElementType, string> = {
    tuz: '#fb923c',
    levego: '#93c5fd',
    viz: '#38bdf8',
    fold: '#86efac',
  };

  return (
    <div className="space-y-4">
      {/* Tab: fekete / fehér tükör */}
      <div className="flex rounded-xl border border-border/40 bg-muted/20 p-1">
        {(['fekete', 'feher'] as SoulMirrorType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setActiveTab(tab); setShowAddForm(false); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-primary/30 text-accent shadow-glow-gold'
                : 'text-muted-foreground hover:text-cream'
            }`}
          >
            {tab === 'fekete' ? '🖤 Fekete tükör' : '🤍 Fehér tükör'}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {activeTab === 'fekete'
          ? 'Hibák, gyengeségek, szenvedélyek — elemekhez rendelve.'
          : 'Erények, jó tulajdonságok — elemekhez rendelve.'}
      </p>

      {/* Tételek listája */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Betöltés…</p>
      ) : tabItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 py-6 text-center text-sm text-muted-foreground">
          Még nincs tétel ebben a tükörben.
        </p>
      ) : (
        <div className="space-y-2">
          {tabItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 transition-all ${
                item.resolved
                  ? 'border-green-500/20 bg-green-500/5 opacity-60'
                  : 'border-border/40 bg-card/30'
              }`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleResolved(item)}
                  className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 transition-all ${
                    item.resolved
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-muted-foreground/40 hover:border-accent/50'
                  }`}
                >
                  {item.resolved && <span className="text-[10px]">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${item.resolved ? 'line-through text-muted-foreground' : 'text-cream'}`}>
                      {item.trait}
                    </span>
                    {item.element && (
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ color: ELEMENT_COLORS[item.element], background: `${ELEMENT_COLORS[item.element]}18` }}
                      >
                        {ELEMENT_LABELS[item.element]}
                      </span>
                    )}
                    <span
                      className="text-xs text-accent/70"
                      title={INTENSITY_TITLES[item.intensity]}
                    >
                      {INTENSITY_LABELS[item.intensity]}
                    </span>
                  </div>

                  {/* Módszer (csak fekete tükör + fokozat 2+) */}
                  {showWorkMethods && activeTab === 'fekete' && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(['uralas', 'autoszuggeszcio', 'transzmutacio'] as WorkMethod[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setWorkMethod(item, item.work_method === m ? null : m)}
                          className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-all ${
                            item.work_method === m
                              ? 'bg-accent/20 text-accent shadow-glow-gold'
                              : 'bg-muted/30 text-muted-foreground hover:text-cream'
                          }`}
                        >
                          {WORK_METHOD_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="shrink-0 text-xs text-muted-foreground/50 transition hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hozzáadás form */}
      {showAddForm ? (
        <div className="rounded-xl border border-border/40 bg-card/20 p-4 space-y-3">
          <input
            type="text"
            value={newItem.trait}
            onChange={(e) => setNewItem((n) => ({ ...n, trait: e.target.value }))}
            placeholder={activeTab === 'fekete' ? 'Hiba / gyengeség neve…' : 'Erény / jó tulajdonság neve…'}
            className="w-full rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-sm text-cream placeholder:text-muted-foreground/50 focus:border-accent/50 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex flex-wrap gap-2">
            {(['tuz', 'levego', 'viz', 'fold'] as ElementType[]).map((el) => (
              <button
                key={el}
                type="button"
                onClick={() => setNewItem((n) => ({ ...n, element: n.element === el ? '' : el }))}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  newItem.element === el
                    ? 'bg-accent/20 text-accent shadow-glow-gold'
                    : 'border border-border/40 text-muted-foreground hover:text-cream'
                }`}
                style={newItem.element === el ? { color: ELEMENT_COLORS[el] } : {}}
              >
                {ELEMENT_LABELS[el]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNewItem((ni) => ({ ...ni, intensity: n as 1 | 2 | 3 }))}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                  newItem.intensity === n
                    ? 'bg-accent/20 text-accent shadow-glow-gold'
                    : 'border border-border/40 text-muted-foreground hover:text-cream'
                }`}
              >
                {INTENSITY_LABELS[n]} {INTENSITY_TITLES[n]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newItem.trait.trim()}
              className="flex-1 rounded-xl bg-accent/20 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/30 disabled:opacity-50"
            >
              {saving ? 'Mentés…' : 'Hozzáadás'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewItem(BLANK_ITEM); }}
              className="rounded-xl border border-border/40 px-4 py-2.5 text-sm text-muted-foreground transition hover:text-cream"
            >
              Mégse
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-3 text-sm text-muted-foreground transition hover:border-accent/30 hover:text-cream"
        >
          + Tétel hozzáadása
        </button>
      )}
    </div>
  );
}
