import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Phone, Save, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
}

interface AnalysisData {
  date: string;
  overall: number;
  // Voice Modulation sub-parameters
  voiceClarity: number;
  tonalVariation: number;
  paceAndPauses: number;
  fillersAndHabits: number;
  // Thought Structure sub-parameters
  purposeArticulation: number;
  logicalFlow: number;
  signposting: number;
  closureStrength: number;
  // Vocabulary sub-parameters
  wordChoice: number;
  grammarAccuracy: number;
  sentenceConstruction: number;
  contextualFit: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalysisData[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchAnalytics();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhoneNumber(data.phone_number || '');
    }
  };

  const fetchAnalytics = async () => {
    if (!user) return;
    setIsLoadingAnalytics(true);
    
    const { data, error } = await supabase
      .from('speech_analyses')
      .select('created_at, overall_score, categories')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching analytics:', error);
      setIsLoadingAnalytics(false);
      return;
    }
    
    if (data) {
      const formattedData: AnalysisData[] = data.map((analysis) => {
        const categories = analysis.categories as any;
        const voiceMod = categories?.voiceModulation || {};
        const thoughtStr = categories?.thoughtStructure || {};
        const vocab = categories?.vocabulary || {};
        
        return {
          date: new Date(analysis.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          overall: analysis.overall_score,
          // Voice Modulation sub-parameters
          voiceClarity: voiceMod?.voiceClarity?.score || 0,
          tonalVariation: voiceMod?.tonalVariation?.score || 0,
          paceAndPauses: voiceMod?.paceAndPauses?.score || 0,
          fillersAndHabits: voiceMod?.fillersAndHabits?.score || 0,
          // Thought Structure sub-parameters
          purposeArticulation: thoughtStr?.purposeArticulation?.score || 0,
          logicalFlow: thoughtStr?.logicalFlow?.score || 0,
          signposting: thoughtStr?.signposting?.score || 0,
          closureStrength: thoughtStr?.closureStrength?.score || 0,
          // Vocabulary sub-parameters
          wordChoice: vocab?.wordChoice?.score || 0,
          grammarAccuracy: vocab?.grammarAccuracy?.score || 0,
          sentenceConstruction: vocab?.sentenceConstruction?.score || 0,
          contextualFit: vocab?.contextualFit?.score || 0,
        };
      });
      setAnalyticsData(formattedData);
    }
    setIsLoadingAnalytics(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        full_name: fullName,
        phone_number: phoneNumber,
      }, { onConflict: 'user_id' });
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully.',
      });
    }
    setIsSaving(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const chartColors = {
    overall: 'hsl(0, 72%, 55%)',
    // Voice Modulation colors
    voiceClarity: 'hsl(220, 70%, 50%)',
    tonalVariation: 'hsl(200, 80%, 50%)',
    paceAndPauses: 'hsl(180, 70%, 45%)',
    fillersAndHabits: 'hsl(160, 60%, 45%)',
    // Thought Structure colors
    purposeArticulation: 'hsl(38, 92%, 50%)',
    logicalFlow: 'hsl(25, 85%, 55%)',
    signposting: 'hsl(45, 90%, 48%)',
    closureStrength: 'hsl(55, 80%, 45%)',
    // Vocabulary colors
    wordChoice: 'hsl(145, 65%, 42%)',
    grammarAccuracy: 'hsl(130, 55%, 50%)',
    sentenceConstruction: 'hsl(100, 50%, 45%)',
    contextualFit: 'hsl(80, 60%, 40%)',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              My Profile
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="w-5 h-5 text-accent" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-card border-border"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-foreground">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="bg-card border-border"
                />
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-accent" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
                </div>
              ) : analyticsData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>No analysis data yet. Complete some speech analyses to see your progress!</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Overall Score Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Overall Score Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="overall" 
                            stroke={chartColors.overall}
                            strokeWidth={3}
                            dot={{ fill: chartColors.overall, strokeWidth: 2 }}
                            name="Overall Score"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Voice Modulation Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Voice Modulation</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="voiceClarity" 
                            stroke={chartColors.voiceClarity}
                            strokeWidth={2}
                            dot={{ fill: chartColors.voiceClarity }}
                            name="Voice Clarity & Projection"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="tonalVariation" 
                            stroke={chartColors.tonalVariation}
                            strokeWidth={2}
                            dot={{ fill: chartColors.tonalVariation }}
                            name="Tonal Variation"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="paceAndPauses" 
                            stroke={chartColors.paceAndPauses}
                            strokeWidth={2}
                            dot={{ fill: chartColors.paceAndPauses }}
                            name="Pace & Pauses"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="fillersAndHabits" 
                            stroke={chartColors.fillersAndHabits}
                            strokeWidth={2}
                            dot={{ fill: chartColors.fillersAndHabits }}
                            name="Fillers & Verbal Habits"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Thought Structure Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Thought Structure</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="purposeArticulation" 
                            stroke={chartColors.purposeArticulation}
                            strokeWidth={2}
                            dot={{ fill: chartColors.purposeArticulation }}
                            name="Purpose Articulation"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="logicalFlow" 
                            stroke={chartColors.logicalFlow}
                            strokeWidth={2}
                            dot={{ fill: chartColors.logicalFlow }}
                            name="Logical Flow"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="signposting" 
                            stroke={chartColors.signposting}
                            strokeWidth={2}
                            dot={{ fill: chartColors.signposting }}
                            name="Signposting"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="closureStrength" 
                            stroke={chartColors.closureStrength}
                            strokeWidth={2}
                            dot={{ fill: chartColors.closureStrength }}
                            name="Closure Strength"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Vocabulary Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Vocabulary</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="wordChoice" 
                            stroke={chartColors.wordChoice}
                            strokeWidth={2}
                            dot={{ fill: chartColors.wordChoice }}
                            name="Word Choice"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="grammarAccuracy" 
                            stroke={chartColors.grammarAccuracy}
                            strokeWidth={2}
                            dot={{ fill: chartColors.grammarAccuracy }}
                            name="Grammar Accuracy"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sentenceConstruction" 
                            stroke={chartColors.sentenceConstruction}
                            strokeWidth={2}
                            dot={{ fill: chartColors.sentenceConstruction }}
                            name="Sentence Construction"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="contextualFit" 
                            stroke={chartColors.contextualFit}
                            strokeWidth={2}
                            dot={{ fill: chartColors.contextualFit }}
                            name="Contextual Fit"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;
