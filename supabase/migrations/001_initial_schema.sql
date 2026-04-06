-- mypr.pro.bd Initial Schema Migration
-- Run this in Supabase Dashboard → SQL Editor or via CLI

-- Note: Supabase uses gen_random_uuid() which is built-in to PostgreSQL
-- No need for uuid-ossp extension

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    github_username TEXT UNIQUE NOT NULL,
    github_avatar_url TEXT,
    github_access_token TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create repositories table
CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    repo_full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_repo UNIQUE (user_id, repo_full_name)
);

-- Create pull_requests table
CREATE TABLE IF NOT EXISTS public.pull_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    repo_full_name TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body_summary TEXT,
    pr_url TEXT NOT NULL,
    merged_at TIMESTAMPTZ NOT NULL,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    commits_count INTEGER DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_pr UNIQUE (user_id, repo_full_name, pr_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON public.repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repositories_is_active ON public.repositories(is_active);
CREATE INDEX IF NOT EXISTS idx_pull_requests_user_id ON public.pull_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_merged_at ON public.pull_requests(merged_at DESC);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_full_name ON public.pull_requests(repo_full_name);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for follows
CREATE POLICY "Users can view all follows" ON public.follows
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own follows" ON public.follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows" ON public.follows
    FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for repositories
CREATE POLICY "Users can view their own repositories" ON public.repositories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repositories" ON public.repositories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repositories" ON public.repositories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own repositories" ON public.repositories
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pull_requests
CREATE POLICY "Users can view all pull requests" ON public.pull_requests
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own pull requests" ON public.pull_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pull requests" ON public.pull_requests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pull requests" ON public.pull_requests
    FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, github_username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on sign up
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.follows TO authenticated;
GRANT ALL ON public.repositories TO authenticated;
GRANT ALL ON public.pull_requests TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.follows TO anon;
GRANT SELECT ON public.pull_requests TO anon;
