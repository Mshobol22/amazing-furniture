import Image from 'next/image'
import Link from 'next/link'
import { getActiveSaleEvents } from '@/lib/actions/sale-actions'
import { createAdminClient } from '@/lib/supabase/admin'

async function getOnSaleImages(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('images')
    .eq('on_sale', true)
    .eq('in_stock', true)
    .not('images', 'is', null)
    .limit(8)
  if (!data) return []
  const images: string[] = []
  for (const row of data) {
    const img = row.images?.[0]
    if (img && images.length < 4) images.push(img)
  }
  return images
}

export default async function SaleEventBlock() {
  const [saleEvents, saleImages] = await Promise.all([
    getActiveSaleEvents(),
    getOnSaleImages(),
  ])

  // Hide if no active events or no on-sale products
  if (saleEvents.length === 0 || saleImages.length === 0) return null

  const activeChips = saleEvents.slice(0, 5)

  return (
    <section className="relative flex min-h-[400px] w-full overflow-hidden bg-[#1C1C1C]">
      {/* Left: text content */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-14">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#2D4A3E]">
          Limited Time Offers
        </p>
        <h2 className="text-4xl font-bold leading-tight text-[#FAF8F5] sm:text-5xl">
          On Sale Now
        </h2>
        <p className="mt-3 text-base text-[#FAF8F5]/70">
          Shop our latest deals across all furniture categories
        </p>
        <Link
          href="/sale"
          className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-[#2D4A3E] px-6 py-3 text-sm font-semibold text-[#FAF8F5] transition-colors hover:bg-[#3B5E4F]"
        >
          View All Sales →
        </Link>
        {/* Chips */}
        {activeChips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {activeChips.map(ev => (
              <Link
                key={ev.id}
                href={`/sale?event=${ev.slug}`}
                className="rounded-full border border-[#FAF8F5]/30 px-3 py-1 text-xs text-[#FAF8F5]/80 transition-colors hover:border-[#FAF8F5]/60 hover:text-[#FAF8F5]"
              >
                {ev.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Right: 2×2 mosaic */}
      <div className="hidden lg:grid lg:w-1/2 lg:grid-cols-2 lg:grid-rows-2">
        {[0, 1, 2, 3].map(i => {
          const src = saleImages[i]
          return (
            <Link key={i} href="/sale" className="group relative overflow-hidden bg-[#2D4A3E]/20">
              {src ? (
                <Image
                  src={src}
                  alt="On sale furniture"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="25vw"
                />
              ) : (
                <div className="h-full w-full bg-[#2D4A3E]/30" />
              )}
              <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
