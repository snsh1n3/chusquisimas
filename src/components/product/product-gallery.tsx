"use client";
import Image from "next/image";
import { useState } from "react";

import type { PublicProduct } from "@/lib/catalog/public-catalog";

/**
 * Galería de la página de producto: foto principal grande y miniaturas.
 * Las imágenes ya vienen en WebP redimensionadas desde R2 (1400 px y 480 px),
 * por eso se sirven sin el optimizador de Next.
 */
export function ProductGallery({ name, images }: { name: string; images: PublicProduct["images"] }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-card bg-panel">
        <span className="text-sm font-bold text-fg-muted">Fotografía próximamente</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-card bg-panel">
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt || name}
          fill
          priority={selected === 0}
          unoptimized
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label={`Fotografías de ${name}`}>
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver fotografía ${index + 1} de ${images.length}: ${image.alt}`}
                aria-current={index === selected ? "true" : undefined}
                className={`relative block h-20 w-20 overflow-hidden rounded-control border-2 transition ${
                  index === selected ? "border-selected" : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                <Image src={image.thumbSrc ?? image.src} alt="" fill unoptimized sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
