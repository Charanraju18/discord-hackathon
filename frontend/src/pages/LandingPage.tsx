import React from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Mic,
  Video,
  Users,
  Globe,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";
import discordIcons from "../assets/discord-icon.png"
export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen overflow-y-auto min-h-screen bg-[#111214] text-white font-sans overflow-x-hidden selection:bg-[#5865F2] selection:text-white"
      style={{ height: "100vh" }}
    >
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-[#111214]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5865F2] rounded-xl flex items-center justify-center rotate-3 hover:rotate-12 transition-transform duration-300">
              <img className="w-9 h-9" src={discordIcons} alt="Home" />
            </div>
            <span className="text-xl font-bold tracking-tight"> <a href="/">Discord</a></span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            {/* <a href="#safety" className="hover:text-white transition-colors">Safety</a> */}
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium hover:text-white transition-colors text-gray-300"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-[0_0_20px_rgba(88,101,242,0.3)] hover:shadow-[0_0_25px_rgba(88,101,242,0.5)] transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#5865F2]/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Imagine a place <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#00A8FC]">
              for your community
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Where you can belong to a school club, a gaming group, or a worldwide art community.
            Where just you and a handful of friends can spend time together. A place that makes it
            easy to talk every day and hang out more often.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-[#white] hover:text-[#5865F2] text-[#111214] bg-white px-8 py-4 rounded-full text-lg font-bold transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 shadow-xl"
            >
              Register for Discord
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-[#2B2D31] hover:bg-[#313338] text-white px-8 py-4 rounded-full text-lg font-bold transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1"
            >
              Login to Discord
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[#1E1F22] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Create an invite-only place</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discord servers are organized into topic-based channels where you can collaborate, share, and just talk about your day without clogging up a group chat.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "Real-time Chat",
                desc: "Lightning fast text channels with rich media, threading, and custom emojis.",
                color: "text-blue-400",
                bg: "bg-blue-400/10"
              },
              {
                icon: Mic,
                title: "Voice Channels",
                desc: "Drop in and out of voice calls. No ringing, just pure connection.",
                color: "text-green-400",
                bg: "bg-green-400/10"
              },
              {
                icon: Video,
                title: "Video Calls",
                desc: "High quality screen sharing and video chat for hanging out.",
                color: "text-purple-400",
                bg: "bg-purple-400/10"
              },
              {
                icon: Users,
                title: "Communities",
                desc: "Tools to moderate and grow your community, big or small.",
                color: "text-orange-400",
                bg: "bg-orange-400/10"
              }
            ].map((feat, i) => (
              <div key={i} className="bg-[#2B2D31] p-8 rounded-2xl hover:bg-[#313338] transition-colors group cursor-pointer border border-white/5 hover:border-white/10">
                <div className={`w-14 h-14 ${feat.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feat.icon className={`w-7 h-7 ${feat.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternating Feature Section */}
      <section className="py-24 bg-[#111214]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 order-2 md:order-1">
              <div className="bg-[#2B2D31] rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-white/5">
                {/* Mock UI */}
                <div className="flex gap-4">
                  <div className="w-12 flex flex-col gap-3">
                    <div className="w-12 h-12 bg-[#5865F2] rounded-2xl"></div>
                    <div className="w-12 h-12 bg-[#313338] rounded-full"></div>
                    <div className="w-12 h-12 bg-[#313338] rounded-full"></div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="h-6 w-32 bg-[#313338] rounded-md"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 bg-[#1E1F22] rounded"></div>
                      <div className="h-4 w-1/2 bg-[#1E1F22] rounded"></div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-500/20"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Where hanging out is easy</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Grab a seat in a voice channel when you're free. Friends in your server can see you're around and instantly pop in to talk without having to call.
              </p>
              <Link to="/register" className="inline-flex items-center gap-2 text-[#5865F2] hover:text-[#4752C4] font-semibold text-lg transition-colors group">
                Try it out <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-[#5865F2] text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by communities</h2>
            <p className="text-blue-100 text-lg">Don't just take our word for it.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Discord completely changed how our development team communicates. The voice channels are a game changer.",
                author: "Sarah J.",
                role: "Lead Developer"
              },
              {
                quote: "The best place to hang out with my gaming friends. Quality is crystal clear and it just works.",
                author: "Marcus T.",
                role: "Content Creator"
              },
              {
                quote: "We moved our entire study group to Discord. Screen sharing makes collaborative work so much easier.",
                author: "Emily R.",
                role: "University Student"
              }
            ].map((t, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
                <div className="text-blue-200 mb-6">
                  <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                </div>
                <p className="text-lg mb-6 leading-relaxed">"{t.quote}"</p>
                <div>
                  <p className="font-bold">{t.author}</p>
                  <p className="text-blue-200 text-sm">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111214] pt-20 pb-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-[#5865F2] rounded-lg flex items-center justify-center">
                  <img className="w-9 h-9" src={discordIcons} alt="Home" />
                </div>
                <span className="text-xl font-bold tracking-tight">Discord</span>
              </div>
              <div className="flex gap-4 text-gray-400">
                <div className="w-10 h-10 rounded-full bg-[#2B2D31] flex items-center justify-center hover:bg-[#5865F2] hover:text-white transition-colors cursor-pointer">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-[#2B2D31] flex items-center justify-center hover:bg-[#5865F2] hover:text-white transition-colors cursor-pointer">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-full bg-[#2B2D31] flex items-center justify-center hover:bg-[#5865F2] hover:text-white transition-colors cursor-pointer">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[#5865F2] font-semibold mb-6">Product</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="https://discord.com/download" className="hover:text-white transition-colors">Download</a></li>
                <li><a href="https://discord.com/nitro" className="hover:text-white transition-colors">Nitro</a></li>
                <li><a href="https://discordstatus.com/" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="https://discord.com/apps" className="hover:text-white transition-colors">App Directory</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[#5865F2] font-semibold mb-6">Company</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="https://discord.com/company" className="hover:text-white transition-colors">About</a></li>
                <li><a href="https://discord.com/careers" className="hover:text-white transition-colors">Jobs</a></li>
                <li><a href="https://discord.com/branding" className="hover:text-white transition-colors">Brand</a></li>
                <li><a href="https://discord.com/newsroom" className="hover:text-white transition-colors">Newsroom</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[#5865F2] font-semibold mb-6">Policies</h4>
              <ul className="space-y-4 text-gray-400">
                <li><a href="https://discord.com/terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="https://discord.com/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="https://discord.com/cookies" className="hover:text-white transition-colors">Cookie Settings</a></li>
                <li><a href="https://discord.com/community-guidelines" className="hover:text-white transition-colors">Guidelines</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© 2026 Discord. Inspired by Discord.</p>
            <Link to="/register" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-2 rounded-full text-sm font-semibold transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
