import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

const jobRoles = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'product_management', label: 'Product Management' },
  { value: 'data_analytics', label: 'Data Analytics' },
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'sales', label: 'Sales' },
  { value: 'hr', label: 'HR' },
  { value: 'other', label: 'Other' },
];

const tonePreferences = [
  { value: 'professional', label: 'Professional', desc: 'Clear and authoritative' },
  { value: 'witty', label: 'Witty', desc: 'Clever and engaging' },
  { value: 'calm', label: 'Calm', desc: 'Soothing and thoughtful' },
  { value: 'bold', label: 'Bold', desc: 'Confident and direct' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
];

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTone, setSelectedTone] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleComplete = async () => {
    if (!user || !selectedRole || !selectedTone) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          job_role: selectedRole,
          tone_preference: selectedTone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile updated!',
        description: 'Let\'s start creating content.',
      });

      navigate('/input');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-prism-gradient mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Let's personalize your experience</h1>
          <p className="text-muted-foreground mt-2">
            Step {step} of 2
          </p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
          {step === 1 ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">What's your role?</h2>
              <div className="grid grid-cols-2 gap-3">
                {jobRoles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => setSelectedRole(role.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedRole === role.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium text-foreground">{role.label}</span>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedRole}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Choose your tone</h2>
              <div className="space-y-3">
                {tonePreferences.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => setSelectedTone(tone.value)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTone === tone.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-foreground">{tone.label}</div>
                    <div className="text-sm text-muted-foreground">{tone.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!selectedTone || loading}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Get Started'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
