import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ModeToggle } from "../../../components/ui/darkToggle";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-6 z-30 flex justify-center px-6">
      <nav
        className="
          flex
          w-full
          max-w-7xl
          items-center
          justify-between
          rounded-2xl
          border
          border-white/20
          bg-zinc-800/70
          px-6
          py-3
          backdrop-blur-2xl
          shadow-[0_10px_60px_rgba(0,0,0,0.45)]
        "
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              bg-white/5
              text-lg
              font-bold
              text-white
              transition
              duration-300
              hover:bg-yellow-600
              hover:text-white
            "
          >
            Z
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-yellow-600">
              Zohra
            </h1>
            <p className="text-xs text-zinc-700">
              AI Workspace
            </p>
          </div>
        </Link>
        {/* Navigation */}
        <ul className="hidden items-center gap-8 md:flex">
          <li>
            <Link
              href="/about"
              className="
                text-sm
                text-zinc-400
                transition-colors
                duration-200
                hover:text-yellow-600
              "
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/pricing"
              className="
                text-sm
                text-zinc-400
                transition-colors
                duration-200
                hover:text-yellow-600
              "
            >
              Pricing
            </Link>
          </li>
        </ul>
        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="
              rounded-xl
              border
              border-transparent
              px-4
              py-2
              text-sm
              font-medium
              text-zinc-400
              transition-all
              duration-300
              hover:border-white/10
              hover:bg-white/5
              hover:text-white
            "
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="
              inline-flex
              items-center
              gap-2
              rounded-xl
              bg-white
              px-5
              py-2
              text-sm
              font-semibold
              text-black
              transition-all
              duration-300
              hover:scale-[1.03]
              hover:bg-zinc-200
            "
          >
            Get Started
            <ArrowRight size={16} />
          </Link>
          <ModeToggle />
        </div>
      </nav>
    </header>
  );
}