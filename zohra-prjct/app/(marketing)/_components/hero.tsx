export default function HeroSection() {
    return (
        <section className="relative flex items-center justify-center mt-26 px-20 h-[calc(100vh-80px)]">
            <div className="absolute inset-0 z-10 flex flex-col px-6">
                <span className="bg-amber-300 text-fg-brand-strong text-xs font-medium px-1.5 py-0.5 rounded">Brand</span>
            </div>
        </section>
    )
}

