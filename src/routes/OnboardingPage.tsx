import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, BookOpen, Zap, Sparkles } from 'lucide-react';
import { genres } from '@/services/mock/data/genres';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useAuthStore } from '@/stores/auth-store';
import { useToastStore } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { CoinIcon } from '@/components/coin/CoinIcon';

type OnboardingStep = 'welcome' | 'genres' | 'slides';

const SLIDES = [
  {
    icon: Headphones,
    title: 'Immersive Audio Stories',
    description:
      'Dive into progression fantasy, LitRPG, cultivation, and more—narrated by talented voice actors.',
  },
  {
    icon: Zap,
    title: 'Unlock with Coins',
    description:
      'Earn coins through daily bonuses and unlock premium episodes one by one, or subscribe for unlimited access.',
  },
  {
    icon: BookOpen,
    title: 'Your Personal Library',
    description:
      'Save favorites, track your listening progress, and download episodes to enjoy offline anywhere.',
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const onboardingSetGenres = useOnboardingStore((s) => s.setSelectedGenres);
  const onboardingComplete = useOnboardingStore((s) => s.completeOnboarding);
  const authCompleteOnboarding = useAuthStore((s) => s.completeOnboarding);
  const addToast = useToastStore((s) => s.addToast);

  const toggleGenre = useCallback((genreId: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId],
    );
  }, []);

  const handleFinish = useCallback(() => {
    onboardingSetGenres(selectedGenres);
    onboardingComplete();
    authCompleteOnboarding(selectedGenres);
    addToast({
      type: 'success',
      title: 'Welcome aboard!',
      message: 'Your personalized audio adventure is ready to begin.',
      duration: 5000,
    });
    navigate('/', { replace: true });
  }, [selectedGenres, onboardingSetGenres, onboardingComplete, authCompleteOnboarding, addToast, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-dark px-6 py-8">
      <AnimatePresence mode="wait">
        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="flex max-w-md flex-col items-center text-center"
          >
            <div className="animate-float">
              <CoinIcon size={80} spinning />
            </div>
            <h1 className="mt-6 font-display text-3xl font-bold bg-gradient-to-r from-gold-bright via-gold to-gold-dark bg-clip-text text-transparent">
              Welcome to LevelUp Audio
            </h1>
            <p className="mt-3 text-base leading-relaxed text-text-secondary">
              Your portal to epic audio adventures. Level up your listening experience
              with progression fantasy, LitRPG, cultivation stories, and more.
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-8"
              onClick={() => setStep('genres')}
            >
              Get Started
            </Button>
          </motion.div>
        )}

        {/* Step 2: Genre Preferences */}
        {step === 'genres' && (
          <motion.div
            key="genres"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md"
          >
            <h2 className="text-center font-display text-2xl font-bold text-gold-bright">
              Choose your favorite genres
            </h2>
            <p className="mt-2 text-center text-sm text-text-secondary">
              Select at least one to personalize your experience
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {genres.map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <motion.button
                    key={genre.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleGenre(genre.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-gold/60 bg-gold/10 shadow-gold-glow-sm'
                        : 'border-bg-hover bg-bg-elevated hover:border-gold/30'
                    }`}
                  >
                    <span
                      className={`font-display text-sm font-semibold ${
                        isSelected ? 'text-gold-bright' : 'text-text-primary'
                      }`}
                    >
                      {genre.name}
                    </span>
                    <p
                      className={`mt-1 text-xs leading-snug ${
                        isSelected ? 'text-gold/80' : 'text-text-muted'
                      }`}
                    >
                      {genre.description}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-8"
              disabled={selectedGenres.length === 0}
              onClick={() => setStep('slides')}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* Step 3: Onboarding Slides */}
        {step === 'slides' && (
          <motion.div
            key="slides"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.35 }}
            className="flex max-w-md flex-col items-center text-center"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/30 bg-bg-elevated">
                  {(() => {
                    const Icon = SLIDES[currentSlide].icon;
                    return <Icon size={36} className="text-gold-bright" />;
                  })()}
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-text-primary">
                  {SLIDES[currentSlide].title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {SLIDES[currentSlide].description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Slide dots */}
            <div className="mt-8 flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentSlide
                      ? 'w-6 bg-gold-bright'
                      : 'w-2 bg-bg-hover hover:bg-text-muted'
                  }`}
                />
              ))}
            </div>

            <div className="mt-8 flex w-full gap-3">
              {currentSlide > 0 && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setCurrentSlide((s) => s - 1)}
                >
                  Back
                </Button>
              )}
              {currentSlide < SLIDES.length - 1 ? (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setCurrentSlide((s) => s + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  fullWidth
                  leftIcon={<Sparkles size={18} />}
                  onClick={handleFinish}
                >
                  Start Listening
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
