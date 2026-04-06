import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            CampusConnect
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-sm font-medium">
              About
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Transforming Campus Communication
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            CampusConnect was born from a simple observation: students waste countless hours trying to meet with faculty members, and faculty struggle to manage their availability effectively.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Mission</h2>
            <p className="text-lg text-muted-foreground text-center mb-12">
              To eliminate wasted time on campus by creating seamless connections between students and faculty through smart technology.
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: '⏰',
                  title: 'Save Time',
                  description: 'No more walking between buildings to find faculty. Check availability instantly from anywhere.',
                },
                {
                  icon: '🎯',
                  title: 'Reduce Friction',
                  description: 'Book appointments with a single click. No more back-and-forth emails or missed connections.',
                },
                {
                  icon: '📊',
                  title: 'Gain Insights',
                  description: 'Institutions get actionable data on faculty-student engagement to improve operations.',
                },
              ].map((item, index) => (
                <div key={index} className="text-center p-6">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <div className="prose dark:prose-invert mx-auto">
              <p className="text-muted-foreground mb-4">
                CampusConnect started in 2024 when a group of engineering students got frustrated with the endless loops of trying to meet their project guides. They&apos;d walk to the faculty cabin, find it empty, wait for hours, or learn the professor was on leave—all without any way to know beforehand.
              </p>
              <p className="text-muted-foreground mb-4">
                What began as a simple &quot;faculty availability board&quot; evolved into a comprehensive platform that now serves thousands of students and faculty across multiple institutions.
              </p>
              <p className="text-muted-foreground">
                Today, CampusConnect is more than just an availability checker. It&apos;s a complete appointment management system with AI-powered scheduling, real-time notifications, and analytics that help institutions understand and improve faculty-student interactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'User-First Design',
                description: 'Every feature is designed with real user feedback from students and faculty.',
              },
              {
                title: 'Privacy & Security',
                description: 'We take data protection seriously with enterprise-grade security measures.',
              },
              {
                title: 'Continuous Innovation',
                description: 'We constantly improve our AI and features based on usage patterns.',
              },
              {
                title: 'Accessible Education',
                description: 'Making technology accessible to all institutions, regardless of size.',
              },
            ].map((value, index) => (
              <div key={index} className="p-6 border rounded-lg">
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your campus?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join the growing number of institutions saving time and improving communication.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2024 CampusConnect. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
