import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Users, 
  BarChart3, 
  CheckCircle, 
  ArrowRight,
  Building2,
  Zap
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">CampusConnect</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
              <Zap className="mr-2 h-3 w-3 text-yellow-500" />
              <span>Save hours every day with smart scheduling</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
              Know When Your Faculty is{' '}
              <span className="text-primary">Available</span>
            </h1>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Stop wandering across floors looking for faculty. Check real-time availability, 
              book appointments, and get digital tokens — all from your phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline">
                  Request Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Free for up to 10 faculty
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything Your Campus Needs
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform for faculty availability, appointments, and queue management.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Clock className="h-8 w-8 text-primary" />}
              title="Real-Time Status"
              description="Faculty update their status (Free, In Meeting, In Class, On Leave) with one tap. Students see changes instantly."
            />
            <FeatureCard
              icon={<Calendar className="h-8 w-8 text-primary" />}
              title="Smart Appointments"
              description="Book appointments based on faculty's available slots. AI suggests optimal times based on historical patterns."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-primary" />}
              title="Digital Queue"
              description="Join a virtual queue and get notified when it's your turn. No more waiting in crowded corridors."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8 text-primary" />}
              title="Analytics Dashboard"
              description="Admins get insights on faculty engagement, peak hours, and student wait times."
            />
            <FeatureCard
              icon={<Building2 className="h-8 w-8 text-primary" />}
              title="Multi-Department"
              description="Manage multiple departments with separate admins, faculty, and student groups."
            />
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8 text-primary" />}
              title="Document Pre-Check"
              description="AI scans uploaded documents before signing appointments to catch missing requirements."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              How It Works
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              number="1"
              title="Faculty Sets Status"
              description="Faculty updates their real-time availability status through the mobile app or web dashboard."
            />
            <StepCard
              number="2"
              title="Student Finds & Books"
              description="Students search for faculty, check availability, and book appointments or join the queue."
            />
            <StepCard
              number="3"
              title="Get Notified"
              description="Students receive notifications when their appointment is confirmed or their token is called."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready to Transform Your Campus?
          </h2>
          <p className="max-w-2xl mx-auto mb-8 opacity-90">
            Join hundreds of institutions using CampusConnect to save time and improve student-faculty interactions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-bold">CampusConnect</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Smart faculty availability and appointment management for educational institutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-foreground">Request Demo</Link></li>
                <li><Link href="/help" className="hover:text-foreground">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} CampusConnect. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-background">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
