"use client";
import { useEffect, useRef, useState } from "react";
import { audio } from "@/game/audio/engine";
import { paintPowerIcon } from "@/game/art/props";
import { COSMETICS, SLOT_LABELS, getItem, type CosmeticItem, type ItemSlot } from "@/lib/data/cosmetics";
import { levelForXp } from "@/lib/data/rewards";
import { useApp } from "../AppState";
import { Coins, Icon, Portrait, ScreenHeader } from "../ui";

const SLOTS: ItemSlot[] = ["character", "helmet", "trail", "jumpfx", "slidefx", "emote"];
const RARITY: Record<CosmeticItem["rarity"], string> = {
  Common: "text-slate-300 border-slate-300/30",
  Rare: "text-sky-300 border-sky-300/40",
  Epic: "text-fuchsia-300 border-fuchsia-300/40",
  Legendary: "text-amber-300 border-amber-300/50",
};

function FxPreview({ item }: { item: CosmeticItem }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const W = c.width,
      H = c.height;
    ctx.clearRect(0, 0, W, H);
    const col = item.color ?? "#888";
    const col2 = item.color2 ?? col;
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    if (item.slot === "trail") {
      for (let i = 0; i < 26; i++) {
        const t = i / 26;
        ctx.fillStyle = item.id === "trail_rainbow" ? `hsl(${t * 360},90%,60%)` : i % 2 ? col : col2;
        ctx.globalAlpha = 1 - t * 0.9;
        const r = 14 * (1 - t * 0.7);
        if (item.id === "trail_matrix") ctx.fillRect(W / 2 - 4 + Math.sin(i) * 14, H * 0.2 + t * H * 0.7, 6, 12);
        else {
          ctx.beginPath();
          ctx.arc(W / 2 + Math.sin(t * 6) * 10, H * 0.18 + t * H * 0.72, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (item.slot === "jumpfx") {
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 1 - i * 0.3;
        ctx.beginPath();
        ctx.ellipse(W / 2, H * 0.75, 18 + i * 16, 6 + i * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      paintPowerIcon(ctx, "superjump", W / 2, H * 0.38, 0.8, col);
    } else if (item.slot === "slidefx") {
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = i % 2 ? col : "#ffffff";
        ctx.globalAlpha = Math.random();
        ctx.fillRect(10 + Math.random() * (W - 20), H * 0.55 + Math.random() * H * 0.3, item.id === "sfx_neon" ? 30 : 4, 3);
      }
    } else if (item.slot === "emote") {
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 30, -Math.PI * 0.2, Math.PI * 1.4);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(W / 2 + 34, H / 2 - 22);
      ctx.lineTo(W / 2 + 18, H / 2 - 34);
      ctx.lineTo(W / 2 + 40, H / 2 - 40);
      ctx.fill();
    }
    ctx.restore();
  }, [item]);
  return <canvas ref={ref} width={140} height={140} className="h-28 w-28" />;
}

export default function Shop() {
  const { state, run, setState, toast } = useApp();
  const [slot, setSlot] = useState<ItemSlot>("character");
  const [busy, setBusy] = useState<string | null>(null);
  if (!state) return null;
  const level = levelForXp(state.xp);
  const items = COSMETICS.filter((c) => c.slot === slot);
  const equippedHelmet = state.equipped.helmet;

  const act = async (item: CosmeticItem) => {
    setBusy(item.id);
    const owned = state.inventory.includes(item.id);
    const equipped = state.equipped[item.slot] === item.id;
    let s;
    if (!owned) {
      s = await run((b) => b.purchase(item.id));
      if (s) {
        audio.play("reward");
        toast(`${item.name} unlocked!`, "reward");
        s = (await run((b) => b.equip(item.id))) ?? s;
      }
    } else if (equipped && item.slot !== "character") s = await run((b) => b.unequip(item.slot));
    else s = await run((b) => b.equip(item.id));
    if (s) setState(s);
    setBusy(null);
  };

  return (
    <div className="pb-6">
      <ScreenHeader title="Character shop" subtitle="Cosmetics only · paid with META Coins" right={<Coins value={state.coins} className="text-base" />} />
      <div className="scroll-thin -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SLOTS.map((s) => (
          <button key={s} onClick={() => setSlot(s)} className={`shrink-0 rounded-xl px-3.5 py-2 font-display text-[11px] font-bold uppercase tracking-wider ${slot === s ? "bg-gradient-to-r from-mw-purple to-mw-violet" : "border border-white/10 bg-white/5 text-white/60"}`}>
            {SLOT_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const owned = state.inventory.includes(item.id);
          const equipped = state.equipped[item.slot] === item.id;
          const levelLocked = !!item.unlockLevel && level < item.unlockLevel;
          const reward = item.rewardOnly && !owned;
          const afford = state.coins >= item.price;
          return (
            <div key={item.id} className={`panel flex flex-col overflow-hidden ${equipped ? "shadow-cyan" : ""}`} data-testid={`item-${item.id}`}>
              <div className="relative grid h-36 place-items-center bg-gradient-to-b from-mw-violet/10 to-transparent">
                {item.slot === "character" || item.slot === "helmet" ? (
                  <Portrait characterId={item.slot === "character" ? item.id : state.equipped.character} helmet={item.slot === "helmet" ? item.id : equippedHelmet} size={128} background={false} />
                ) : (
                  <FxPreview item={item} />
                )}
                <span className={`chip absolute left-2 top-2 bg-black/40 ${RARITY[item.rarity]}`}>{item.rarity}</span>
                {equipped && (
                  <span className="chip absolute right-2 top-2 border-mw-cyan/50 bg-black/40 text-mw-cyan">
                    <Icon name="check" className="h-3 w-3" /> On
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="heading text-xs leading-tight">{item.name}</div>
                <p className="flex-1 text-[11px] leading-snug text-white/55">{item.description}</p>
                {owned ? (
                  <button className={equipped ? "btn-ghost w-full py-2 text-xs" : "btn-primary w-full py-2 text-xs"} onClick={() => act(item)} disabled={busy === item.id || (equipped && item.slot === "character")}>
                    {equipped ? (item.slot === "character" ? "Equipped" : "Unequip") : "Equip"}
                  </button>
                ) : levelLocked ? (
                  <div className="chip justify-center py-2">
                    <Icon name="lock" className="h-3.5 w-3.5" /> Level {item.unlockLevel}
                  </div>
                ) : reward ? (
                  <div className="chip justify-center py-2 text-amber-200">
                    <Icon name="gift" className="h-3.5 w-3.5" /> Day 7 reward
                  </div>
                ) : (
                  <button className="btn-gold w-full py-2 text-xs" disabled={!afford || busy === item.id} onClick={() => act(item)}>
                    <Coins value={item.price} className="text-ink-950" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[11px] text-white/40">Equipped: {SLOTS.map((s) => getItem(state.equipped[s])?.name).join(" · ")}</p>
    </div>
  );
}
