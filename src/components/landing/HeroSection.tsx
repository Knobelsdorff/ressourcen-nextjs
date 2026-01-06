"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/modals/auth-modal";
import Image from "next/image";

export default function HeroSection() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCTAClick = () => {
    router.push("/example");
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 lg:px-4 lg:py-20">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 items-start gap-12">
        {/* Bild - Mobile: oben, breitenfüllend | Desktop: links */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="order-1 lg:order-1 w-full lg:h-auto lg:flex lg:justify-center"
        >
          {/* Mobile Bild */}
          <Image
            src="/images/Innere Ruhe aktivieren_Herosection-mobile.webp"
            alt="Innere Ruhe aktivieren"
            width={600}
            height={600}
            className="lg:hidden w-full h-auto object-cover"
            priority
          />
          {/* Desktop Bild */}
          <Image
            src="/images/Innere Ruhe aktivieren_Herosection.webp"
            alt="Innere Ruhe aktivieren"
            width={600}
            height={600}
            className="hidden lg:block rounded-3xl shadow-xl object-cover w-full max-w-md lg:max-w-none"
            priority
          />
        </motion.div>

        {/* Text - Mobile: unter Bild | Desktop: rechts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-2 text-center lg:text-left px-4 lg:px-0 py-8 lg:py-0"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-amber-900 mb-6">
            Finde in nur wenigen Minuten mehr innere Ruhe
          </h1>

          <p className="text-xl md:text-2xl text-amber-700 mb-8">
            Wenn sich viel anstaut, findest du hier wieder <span className="whitespace-nowrap">mehr Halt</span>
          </p>

          <div className="flex justify-center lg:justify-start">
            {user ? (
              <Button
                onClick={handleCTAClick}
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
              >
                Kurz innehalten
              </Button>
            ) : (
              <AuthModal isOnLandingPage={true}>
                <Button
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-8 py-6 rounded-lg"
                >
                  Kurz innehalten
                </Button>
              </AuthModal>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
