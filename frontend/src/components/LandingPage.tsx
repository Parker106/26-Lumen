import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Menu,
  X,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";

interface LandingPageProps {
  onSelectMode: (mode: "patient" | "family" | "caretaker") => void;
}

export function LandingPage({ onSelectMode }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [faqActive, setFaqActive] = useState(1);
  const [serviceIndex, setServiceIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const DURATION = 10000;

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#F6F7FA";
    document.body.style.color = "#17191F";
    return () => { document.body.style.backgroundColor = prev; document.body.style.color = ""; };
  }, []);

  const services = [
    "Voice Companion",
    "Care Memory",
    "Family Connection",
  ];

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("visible"); e.target.classList.remove("reveal-init"); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal-element").forEach((el) => { el.classList.add("reveal-init"); obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const updateSlider = useCallback(() => {
    const el = trackRef.current?.firstElementChild as HTMLElement | null;
    if (!el) return;
    const gap = 32;
    trackRef.current!.style.transform = `translateX(-${(el.offsetWidth + gap) * slideIndex}px)`;
  }, [slideIndex]);

  useEffect(() => { updateSlider(); window.addEventListener("resize", updateSlider); return () => window.removeEventListener("resize", updateSlider); }, [updateSlider]);

  const resetProgress = useCallback(() => {
    const b = progressRef.current; if (!b) return;
    b.style.transition = "none"; b.style.width = "0%"; void b.offsetWidth;
    b.style.transition = `width ${DURATION}ms linear`; b.style.width = "100%";
  }, []);

  useEffect(() => {
    resetProgress();
    const id = setInterval(() => { setServiceIndex((i) => (i + 1) % services.length); resetProgress(); }, DURATION);
    return () => clearInterval(id);
  }, [resetProgress, services.length]);

  const toggleFaq = (i: number) => setFaqActive(faqActive === i ? -1 : i);

  return (
    <div className="lumen-light overflow-x-hidden selection:bg-black selection:text-white" style={{ fontFamily: "'Helvetica Neue', 'Inter', sans-serif" }}>

      <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6">
        <div className="glass-panel flex gap-3 rounded-full pt-2 pr-2 pb-2 pl-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)] items-center justify-between">
          <button onClick={() => setMenuOpen(true)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors group">
            <Menu className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
          </button>
          <div className="px-4 font-medium tracking-tight text-lg hidden md:block uppercase tracking-wider">LUMEN</div>
          <button onClick={() => onSelectMode("patient")} className="bg-[#17191F] text-white px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2 hover:scale-105 transition-transform active:scale-95">
            Talk to Lumen
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <div className={`fixed inset-0 bg-[#F6F7FA] z-[60] flex flex-col transition-all duration-400 ${menuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
        <div className="md:top-8 md:right-8 absolute top-6 right-6">
          <button onClick={() => setMenuOpen(false)} className="flex hover:scale-105 transition-transform bg-white w-14 h-14 rounded-full shadow-lg items-center justify-center">
            <X className="w-6 h-6 text-black" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className={`flex flex-col items-center gap-8 md:gap-10 transition-transform duration-500 ${menuOpen ? "translate-y-0" : "translate-y-5"}`}>
            <button onClick={() => { setMenuOpen(false); onSelectMode("patient"); }} className="text-4xl md:text-6xl font-medium tracking-tighter hover:text-gray-500 transition-colors text-[#17191F]">Talk to Lumen</button>
            <button onClick={() => { setMenuOpen(false); onSelectMode("family"); }} className="text-4xl md:text-6xl font-medium tracking-tighter hover:text-gray-500 transition-colors text-[#17191F]">Family &amp; Friends</button>
            <button onClick={() => { setMenuOpen(false); onSelectMode("caretaker"); }} className="text-4xl md:text-6xl font-medium tracking-tighter hover:text-gray-500 transition-colors text-[#17191F]">Caregiver Dashboard</button>
            <button onClick={() => setMenuOpen(false)} className="text-4xl md:text-6xl font-medium tracking-tighter hover:text-gray-500 transition-colors text-[#17191F]">About Lumen</button>
            <button onClick={() => setMenuOpen(false)} className="text-4xl md:text-6xl font-medium tracking-tighter hover:text-gray-500 transition-colors text-[#17191F]">Contact</button>
          </div>
        </div>
      </div>

      <header className="relative w-full h-screen min-h-[700px] flex flex-col justify-center items-center overflow-hidden bg-[#F6F7FA]">
        <div className="absolute inset-0 top-0 left-0 right-0 bottom-0 z-0">
          <img src="https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg?auto=compress&cs=tinysrgb&w=1920" className="opacity-60 w-full h-full object-cover scale-105" alt="Hero" />
          <div className="absolute inset-0 bg-[#F6F7FA]/30"></div>
          <div className="bg-gradient-to-b from-[#F6F7FA]/40 via-transparent to-[#F6F7FA] absolute top-0 right-0 bottom-0 left-0"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center text-[#17191F] w-full max-w-[90vw] pointer-events-none select-none mix-blend-difference text-white">
          <h1 className="flex flex-col items-center leading-[0.8] tracking-[-0.04em]">
            <span className="text-[14vw] xl:text-[240px] reveal-element font-normal visible">LUMEN</span>
            <span className="text-[7vw] xl:text-[90px] self-end -mt-[1vw] xl:-mt-4 reveal-element mr-[5%] visible" style={{ transitionDelay: "100ms" }}>Voice AI</span>
          </h1>
        </div>
      </header>

      <section className="-mt-12 md:-mt-24 md:px-12 xl:px-24 z-20 pr-6 pb-24 pl-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-[1400px] mr-auto ml-auto">
          <div className="reveal-element flex flex-col justify-center gap-1 md:border-r border-black/10 py-8 md:py-0 md:pr-12 md:pl-0 pl-4 border-l md:border-l-0 visible">
            <div className="text-5xl md:text-[56px] font-normal tracking-tight text-[#17191F]">24/7</div>
            <div className="text-lg md:text-[20px] text-gray-500 font-normal leading-tight">Always Available for Your Loved One</div>
          </div>
          <div className="reveal-element flex flex-col justify-center gap-1 md:border-r border-black/10 py-8 md:py-0 md:px-12 pl-4 border-l md:border-l-0 visible reveal-init">
            <div className="text-5xl md:text-[56px] font-normal tracking-tight text-[#17191F]">RAG</div>
            <div className="text-lg md:text-[20px] text-gray-500 font-normal leading-tight">Answers From Your Notes, Not The Internet</div>
          </div>
          <div className="reveal-element flex flex-col justify-center gap-1 py-8 md:py-0 md:pl-12 pl-4 border-l md:border-l-0 border-black/10 visible reveal-init">
            <div className="text-5xl md:text-[56px] font-normal tracking-tight text-[#17191F]">100%</div>
            <div className="text-lg md:text-[20px] text-gray-500 font-normal leading-tight">Private — Your Data Never Leaves Your Server</div>
          </div>
        </div>
      </section>

      <section className="md:px-12 xl:px-24 max-w-[1400px] mr-auto ml-auto pt-24 pr-6 pb-24 pl-6">
        <div className="mb-16 reveal-element reveal-init">
          <h2 className="md:text-[48px] leading-[1.1] text-5xl font-normal tracking-[-0.04em]">
            Why Families Choose <span className="text-[#A1A19F]">Lumen</span>
          </h2>
          <p className="md:text-xl leading-relaxed text-lg font-light text-gray-600 max-w-2xl mt-8">
            Lumen is not a chatbot. It&apos;s a voice companion that speaks from your caregiver&apos;s notes, remembers your loved one&apos;s world, and never invents answers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative aspect-[3/4] rounded-[24px] overflow-hidden cursor-pointer reveal-element reveal-init">
            <img src="https://images.pexels.com/photos/6624431/pexels-photo-6624431.jpeg?auto=compress&cs=tinysrgb&w=800" className="w-full h-full object-cover hover-card-bg" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-500"></div>
            <div className="flex flex-col pt-6 pr-6 pb-6 pl-6 absolute right-0 bottom-0 left-0 justify-end">
              <div className="glass-panel self-start px-5 py-2.5 rounded-full mb-3 backdrop-blur-md bg-white/90">
                <span className="text-lg font-medium text-black">Compassion</span>
              </div>
              <div className="h-0 overflow-hidden group-hover:h-auto group-active:h-auto transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-active:opacity-100">
                <p className="leading-relaxed text-sm font-medium text-white pt-2 drop-shadow-md">Warm, patient, and calm — designed for people with memory challenges. Lumen never rushes.</p>
              </div>
            </div>
          </div>

          <div className="group relative aspect-[3/4] rounded-[24px] overflow-hidden cursor-pointer lg:translate-y-16 reveal-element reveal-init">
            <img src="https://images.pexels.com/photos/8550841/pexels-photo-8550841.jpeg?auto=compress&cs=tinysrgb&w=800" className="w-full h-full object-cover hover-card-bg" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-500"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end">
              <div className="glass-panel self-start px-5 py-2.5 rounded-full mb-3 backdrop-blur-md bg-white/90">
                <span className="text-lg font-medium text-black">Intelligence</span>
              </div>
              <div className="h-0 overflow-hidden group-hover:h-auto group-active:h-auto transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-active:opacity-100">
                <p className="leading-relaxed text-sm font-medium text-white pt-2 drop-shadow-md">RAG-powered memory retrieves care documents in real-time. No hallucinations, only facts from your notes.</p>
              </div>
            </div>
          </div>

          <div className="group relative aspect-[3/4] rounded-[24px] overflow-hidden cursor-pointer reveal-element reveal-init">
            <img src="https://images.pexels.com/photos/7224923/pexels-photo-7224923.jpeg?auto=compress&cs=tinysrgb&w=800" className="w-full h-full object-cover hover-card-bg" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-500"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end">
              <div className="glass-panel self-start px-5 py-2.5 rounded-full mb-3 backdrop-blur-md bg-white/90">
                <span className="text-lg font-medium text-black">Connection</span>
              </div>
              <div className="h-0 overflow-hidden group-hover:h-auto group-active:h-auto transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-active:opacity-100">
                <p className="text-white text-sm leading-relaxed pt-2 font-medium drop-shadow-md">Family members send messages through the app. Lumen reads them aloud with warmth and care.</p>
              </div>
            </div>
          </div>

          <div className="group relative aspect-[3/4] rounded-[24px] overflow-hidden cursor-pointer lg:translate-y-16 reveal-element reveal-init">
            <img src="https://images.pexels.com/photos/6135022/pexels-photo-6135022.jpeg?auto=compress&cs=tinysrgb&w=800" className="w-full h-full object-cover hover-card-bg" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors duration-500"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col justify-end">
              <div className="glass-panel self-start px-5 py-2.5 rounded-full mb-3 backdrop-blur-md bg-white/90">
                <span className="text-lg font-medium text-black">Safety</span>
              </div>
              <div className="h-0 overflow-hidden group-hover:h-auto group-active:h-auto transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-active:opacity-100">
                <p className="text-white text-sm leading-relaxed pt-2 font-medium drop-shadow-md">Never gives medical advice. Detects emergencies and directs to 911 or the emergency contact.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 lg:mt-32 flex flex-col sm:flex-row gap-4 items-center justify-start reveal-element reveal-init">
          <button onClick={() => onSelectMode("patient")} className="bg-[#17191F] text-white px-8 py-4 rounded-full font-medium text-lg hover:scale-105 transition-transform duration-300 w-full sm:w-auto text-center shadow-lg shadow-black/10">
            Talk to Lumen Now
          </button>
          <button onClick={() => onSelectMode("caretaker")} className="bg-transparent border border-gray-300 text-[#17191F] px-8 py-4 rounded-full font-medium text-lg flex items-center justify-center gap-3 hover:bg-white hover:border-[#17191F] transition-all duration-300 w-full sm:w-auto group">
            Caregiver Dashboard
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      <section className="py-24 bg-[#F6F7FA] overflow-hidden select-none relative">
        <div className="md:px-12 xl:px-24 max-w-[1400px] mr-auto ml-auto pr-6 pl-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 reveal-element">
            <h2 className="md:text-[48px] leading-tight text-4xl font-normal text-[#17191F] tracking-[-0.04em]">
              Trusted by Families<br /><span className="text-[#A1A19F]">Who Care Deeply:</span>
            </h2>
            <div className="flex gap-4 items-center">
              <button onClick={() => setSlideIndex((i) => Math.max(0, i - 1))} className="w-14 h-14 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-[#17191F] hover:text-white hover:border-[#17191F] transition-all duration-300 shadow-sm">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button onClick={() => setSlideIndex((i) => Math.min(2, i + 1))} className="w-14 h-14 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:bg-[#17191F] hover:text-white hover:border-[#17191F] transition-all duration-300 shadow-sm">
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="overflow-hidden">
            <div ref={trackRef} className="flex gap-8 transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]">
              <div className="min-w-full md:min-w-[527px] flex flex-col group hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-shadow bg-white h-[345px] border-gray-200 border rounded-[24px] p-8 relative shadow-[0_4px_20px_rgba(0,0,0,0.02)] justify-between">
                <p className="text-[20px] leading-[1.3] text-[#17191F] tracking-[-0.01em] max-w-sm">
                  &ldquo;My mother finally feels safe when I&apos;m at work. Lumen remembers her routine and gently guides her through the day.&rdquo;
                </p>
                <div className="absolute bottom-[26px] right-[18px] w-[200px] h-[120px] md:w-[280px] md:h-[150px]">
                  <img src="https://images.pexels.com/photos/27176050/pexels-photo-27176050.jpeg?auto=compress&cs=tinysrgb&w=600" className="w-full h-full object-cover rounded-xl shadow-md" />
                  <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur border border-white/50 rounded-full pl-2 pr-5 py-2 flex items-center gap-3 shadow-lg">
                    <img src="https://images.pexels.com/photos/11433421/pexels-photo-11433421.jpeg?auto=compress&cs=tinysrgb&w=150" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="text-black text-sm font-medium">Sarah T.</span>
                      <span className="text-gray-400 text-xs">March 2026</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-full md:min-w-[527px] flex flex-col group hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-shadow bg-white h-[345px] border-gray-200 border rounded-[24px] p-8 relative shadow-[0_4px_20px_rgba(0,0,0,0.02)] justify-between">
                <p className="text-[20px] leading-[1.3] text-[#17191F] tracking-[-0.01em] max-w-sm">
                  &ldquo;The RAG pipeline means Lumen actually knows Dad&apos;s medications and schedule — not generic internet answers.&rdquo;
                </p>
                <div className="absolute bottom-[26px] right-[18px] w-[200px] h-[120px] md:w-[280px] md:h-[150px]">
                  <img src="https://images.pexels.com/photos/6624312/pexels-photo-6624312.jpeg?auto=compress&cs=tinysrgb&w=600" className="w-full h-full object-cover rounded-xl shadow-md" />
                  <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur border border-white/50 rounded-full pl-2 pr-5 py-2 flex items-center gap-3 shadow-lg">
                    <img src="https://images.pexels.com/photos/8860209/pexels-photo-8860209.jpeg?auto=compress&cs=tinysrgb&w=150" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="text-black text-sm font-medium">Michael R.</span>
                      <span className="text-gray-400 text-xs">February 2026</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-full md:min-w-[527px] flex flex-col group hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-shadow bg-white h-[345px] border-gray-200 border rounded-[24px] p-8 relative shadow-[0_4px_20px_rgba(0,0,0,0.02)] justify-between">
                <p className="text-[20px] leading-[1.3] text-[#17191F] tracking-[-0.01em] max-w-sm">
                  &ldquo;As a home health aide, Lumen saves me time on check-ins. The caregiver dashboard shows me exactly what happened.&rdquo;
                </p>
                <div className="absolute bottom-[26px] right-[18px] w-[200px] h-[120px] md:w-[280px] md:h-[150px]">
                  <img src="https://images.pexels.com/photos/6382708/pexels-photo-6382708.jpeg?auto=compress&cs=tinysrgb&w=600" className="w-full h-full object-cover rounded-xl shadow-md" />
                  <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur border border-white/50 rounded-full pl-2 pr-5 py-2 flex items-center gap-3 shadow-lg">
                    <img src="https://images.pexels.com/photos/4588211/pexels-photo-4588211.jpeg?auto=compress&cs=tinysrgb&w=150" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="text-black text-sm font-medium">Priya K.</span>
                      <span className="text-gray-400 text-xs">January 2026</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1400px] mx-auto px-4 md:px-12 xl:px-24 mb-32">
        <div className="relative h-[80vh] min-h-[600px] rounded-[40px] overflow-hidden shadow-2xl reveal-element bg-gray-900">
          <div className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: serviceIndex === 0 ? 1 : 0 }}>
            <img src="https://images.pexels.com/photos/6134901/pexels-photo-6134901.jpeg?auto=compress&cs=tinysrgb&w=1600" className="w-full h-full object-cover opacity-80" />
          </div>
          <div className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: serviceIndex === 1 ? 1 : 0 }}>
            <img src="https://images.pexels.com/photos/6135041/pexels-photo-6135041.jpeg?auto=compress&cs=tinysrgb&w=1600" className="w-full h-full object-cover opacity-80" />
          </div>
          <div className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000" style={{ opacity: serviceIndex === 2 ? 1 : 0 }}>
            <img src="https://images.pexels.com/photos/6624322/pexels-photo-6624322.jpeg?auto=compress&cs=tinysrgb&w=1600" className="w-full h-full object-cover opacity-80" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 px-4">
            <div className="relative h-[120px] md:h-[150px] w-full flex justify-center items-center overflow-hidden">
              <h2 key={serviceIndex} className="text-[8vw] md:text-[6rem] font-normal leading-none tracking-tighter mix-blend-overlay anim-text-enter">{services[serviceIndex]}</h2>
            </div>
            <div className="absolute bottom-16 w-[240px] h-1 bg-white/20 rounded-full overflow-hidden">
              <div ref={progressRef} className="h-full bg-white rounded-full" style={{ width: "0%" }}></div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 md:px-12 xl:px-24 max-w-[1400px] mx-auto mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">
          <div className="reveal-element reveal-init">
            <h2 className="text-4xl md:text-[48px] font-normal tracking-[-0.04em] leading-[1.1] text-[#17191F]">Questions Families Ask</h2>
          </div>

          <div className="space-y-4 reveal-element reveal-init">
            {[
              { q: "How does Lumen know my loved one's routine?", a: "Caregivers add notes, schedules, and care documents through the dashboard. Lumen uses a RAG pipeline to recall this information naturally in conversation — never making things up." },
              { q: "Is my family's data safe?", a: "All data is stored in your private Supabase database with row-level security. API keys stay on your server. Lumen never sends care data to third parties — your information stays yours." },
              { q: "Can Lumen replace a caregiver?", a: "No. Lumen is designed to support caregivers, not replace them. It reminds patients of documented routines and messages, and always directs medical questions to a real caregiver or 911." },
            ].map((item, i) => {
              const isActive = faqActive === i;
              return (
                <div key={i} className={`accordion-item bg-white rounded-[24px] border border-transparent transition-all duration-300 ${isActive ? "shadow-[0_8px_30px_rgba(0,0,0,0.04)] active" : ""}`}>
                  <button onClick={() => toggleFaq(i)} className="w-full flex justify-between items-start text-left p-8 gap-4">
                    <span className="text-xl font-medium tracking-tight text-[#17191F]">{item.q}</span>
                    <div className={`p-3 rounded-full shrink-0 accordion-icon flex items-center justify-center ${isActive ? "bg-[#17191F] text-white" : "bg-[#F6F7FA] text-black"}`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </button>
                  <div className="accordion-content px-8" style={{ maxHeight: isActive ? 200 : 0, opacity: isActive ? 1 : 0 }}>
                    <div className="pb-8 text-gray-600 text-lg leading-relaxed">{item.a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="bg-white pt-24 pb-8 px-6 md:px-12 xl:px-24 rounded-t-[40px] shadow-[0_-10px_60px_rgba(0,0,0,0.03)] relative mt-24">
        <div className="max-w-[1400px] mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-32">
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-400">For Patients</h4>
              <ul className="space-y-4">
                <li><button onClick={() => onSelectMode("patient")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Talk to Lumen</button></li>
                <li><button onClick={() => onSelectMode("patient")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Voice Companion</button></li>
                <li><button onClick={() => onSelectMode("patient")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Daily Routines</button></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-400">For Caregivers</h4>
              <ul className="space-y-4">
                <li><button onClick={() => onSelectMode("caretaker")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Dashboard</button></li>
                <li><button onClick={() => onSelectMode("caretaker")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Care Memory</button></li>
                <li><button onClick={() => onSelectMode("caretaker")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Manage Routines</button></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-400">Family &amp; Friends</h4>
              <ul className="space-y-4">
                <li><button onClick={() => onSelectMode("family")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Send Messages</button></li>
                <li><button onClick={() => onSelectMode("family")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">Stay Connected</button></li>
                <li><button onClick={() => onSelectMode("family")} className="text-2xl font-normal hover:text-gray-500 transition-colors tracking-tight text-[#17191F]">How It Works</button></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-400">Get Started</h4>
              <button onClick={() => onSelectMode("patient")} className="w-full bg-[#17191F] text-white py-4 rounded-xl hover:bg-gray-800 transition-colors font-medium text-left px-6 flex justify-between items-center group">
                Talk to Lumen
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              <div className="relative">
                <input type="email" placeholder="Your email address" className="w-full bg-[#F6F7FA] py-4 pl-6 pr-14 rounded-xl outline-none focus:ring-1 focus:ring-black transition-all text-[#17191F]" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-black/50 hover:text-black">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gray-100 mb-8"></div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500 font-medium">
            <p>© 2026 LUMEN</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-black decoration-1">Privacy Policy</a>
              <a href="#" className="hover:text-black decoration-1">Terms of Service</a>
            </div>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-[#F6F7FA] rounded-full flex items-center justify-center hover:bg-[#17191F] hover:text-white transition-all duration-300 text-[#17191F]">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-[#F6F7FA] rounded-full flex items-center justify-center hover:bg-[#17191F] hover:text-white transition-all duration-300 text-[#17191F]">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-[#F6F7FA] rounded-full flex items-center justify-center hover:bg-[#17191F] hover:text-white transition-all duration-300 text-[#17191F]">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="w-full flex justify-center mt-12 pb-4 opacity-[0.04] pointer-events-none select-none">
          <h1 className="text-[15vw] font-bold leading-none tracking-tighter text-[#17191F]">LUMEN</h1>
        </div>
      </footer>
    </div>
  );
}
