-- Migration to add Chat history tables (conversations, messages)

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" 
    ON public.conversations FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
    ON public.conversations FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
    ON public.conversations FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
    ON public.conversations FOR DELETE 
    USING (auth.uid() = user_id);

-- 5. Create RLS Policies for messages
CREATE POLICY "Users can view messages of their conversations" 
    ON public.messages FOR SELECT 
    USING (auth.uid() IN (SELECT user_id FROM public.conversations WHERE id = conversation_id));

CREATE POLICY "Users can insert messages to their conversations" 
    ON public.messages FOR INSERT 
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.conversations WHERE id = conversation_id));

CREATE POLICY "Users can update messages of their conversations" 
    ON public.messages FOR UPDATE 
    USING (auth.uid() IN (SELECT user_id FROM public.conversations WHERE id = conversation_id));
