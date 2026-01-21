import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Gift } from 'lucide-react';

export default function SpecialOffers() {
  const navigate = useNavigate();

  const handleContactZannes = () => {
    window.location.href = 'mailto:madaline@zanneslaw.com';
  };

  const handleContactUs = () => {
    window.location.href = 'mailto:reggie@havenworkspace.ca';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        <div className="mb-12">
          <h1 className="text-4xl font-heading font-bold mb-3 text-foreground">Special Offers</h1>
          <p className="text-lg text-muted-foreground">
            As a Haven Workspace member, you have access to exclusive discounts and offers from our partners
          </p>
        </div>

        <div className="space-y-8 mb-12">
          <Card className="haven-card border-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-heading font-bold text-foreground">Zannes Law Firm</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Professional business legal services
                  </CardDescription>
                </div>
                <Badge className="text-base px-4 py-2 rounded-xl bg-accent/20 text-primary border-0 font-semibold" variant="secondary">
                  25% OFF
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-base">
                Get 25% off legal fees for contracts, incorporation, and legal consultation.
              </p>
              <Button onClick={handleContactZannes} className="w-full sm:w-auto" size="lg">
                <Mail className="mr-2 h-4 w-4" />
                Contact Zannes Law
              </Button>
            </CardContent>
          </Card>

          <Card className="haven-card border-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-heading font-bold text-foreground">Aperitivo by Revé</CardTitle>
                  <CardDescription className="text-base mt-2">
                    Fresh foods and specialty coffee
                  </CardDescription>
                </div>
                <Badge className="text-base px-4 py-2 rounded-xl bg-accent/20 text-primary border-0 font-semibold" variant="secondary">
                  15% OFF
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-base">
                Enjoy 15% off all fresh foods and coffee. Just mention you're a member at Haven to receive your discount.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="haven-card border-0 bg-accent/5">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-accent/20 rounded-xl">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-heading font-bold text-foreground">Offer a Member Discount?</CardTitle>
            </div>
            <CardDescription className="text-base">
              Are you a Haven member with a business who would like to provide a special offer to other members?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 text-base">
              We'd love to feature your business and help our community support each other. Contact us to discuss adding your offer to this page.
            </p>
            <Button onClick={handleContactUs} variant="secondary" className="w-full sm:w-auto" size="lg">
              <Mail className="mr-2 h-4 w-4" />
              Contact Us
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}