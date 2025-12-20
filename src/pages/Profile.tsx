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
  voiceClarity: number;
  speechStructure: number;
  vocabulary: number;
  audienceConnection: number;
  emotionalDelivery: number;
  overall: number;
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
        return {
          date: new Date(analysis.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          voiceClarity: categories?.voiceModulation?.voiceClarity?.score || categories?.voiceModulation?.score || 0,
          speechStructure: categories?.thoughtStructure?.score || 0,
          vocabulary: categories?.vocabulary?.score || 0,
          audienceConnection: categories?.thoughtStructure?.logicalFlow?.score || 0,
          emotionalDelivery: categories?.voiceModulation?.tonalVariation?.score || 0,
          overall: analysis.overall_score,
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
    voiceClarity: 'hsl(220, 45%, 20%)',
    speechStructure: 'hsl(38, 92%, 50%)',
    vocabulary: 'hsl(145, 65%, 42%)',
    audienceConnection: 'hsl(280, 60%, 50%)',
    emotionalDelivery: 'hsl(200, 80%, 50%)',
    overall: 'hsl(0, 72%, 55%)',
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

                  {/* All Parameters Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Parameter Breakdown</h3>
                    <div className="h-80">
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
                            name="Voice Clarity"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="speechStructure" 
                            stroke={chartColors.speechStructure}
                            strokeWidth={2}
                            dot={{ fill: chartColors.speechStructure }}
                            name="Speech Structure"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="vocabulary" 
                            stroke={chartColors.vocabulary}
                            strokeWidth={2}
                            dot={{ fill: chartColors.vocabulary }}
                            name="Vocabulary"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="audienceConnection" 
                            stroke={chartColors.audienceConnection}
                            strokeWidth={2}
                            dot={{ fill: chartColors.audienceConnection }}
                            name="Audience Connection"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="emotionalDelivery" 
                            stroke={chartColors.emotionalDelivery}
                            strokeWidth={2}
                            dot={{ fill: chartColors.emotionalDelivery }}
                            name="Emotional Delivery"
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
