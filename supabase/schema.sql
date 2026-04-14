-- ============================================================
-- AGENTE IMOBILIÁRIO ARGENTINA — Schema Supabase
-- Rodar no SQL Editor do Supabase Dashboard
-- ============================================================

-- Enums
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'both', 'agent');
CREATE TYPE property_type AS ENUM ('apartment', 'house', 'ph', 'commercial');
CREATE TYPE currency_type AS ENUM ('ARS', 'USD');
CREATE TYPE urgency_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE listing_status AS ENUM ('active', 'inactive');
CREATE TYPE seller_property_status AS ENUM ('draft', 'active', 'sold');
CREATE TYPE agent_client_status AS ENUM ('active', 'inactive');

-- ============================================================
-- PROFILES (extensão de auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- AGENT_CLIENTS — Relação corretor ↔ clientes
-- ============================================================
CREATE TABLE agent_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status agent_client_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, client_id)
);

-- ============================================================
-- SEARCH_PREFERENCES — Preferências do comprador
-- ============================================================
CREATE TABLE search_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  neighborhood TEXT,
  city TEXT DEFAULT 'Buenos Aires',
  property_type property_type,
  min_m2 NUMERIC,
  max_m2 NUMERIC,
  min_rooms INT,
  max_rooms INT,
  min_bathrooms INT,
  max_bathrooms INT,
  min_price NUMERIC,
  max_price NUMERIC,
  currency currency_type DEFAULT 'USD',
  amenities JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROPERTY_LISTINGS — Imóveis scraped dos portais
-- ============================================================
CREATE TABLE property_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal TEXT NOT NULL,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT,
  m2_total NUMERIC,
  m2_covered NUMERIC,
  rooms INT,
  bathrooms INT,
  parking INT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  amenities JSONB DEFAULT '{}',
  images TEXT[],
  url TEXT NOT NULL,
  listed_date DATE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  status listing_status DEFAULT 'active',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portal, external_id)
);

-- Índices para buscas rápidas
CREATE INDEX idx_listings_neighborhood ON property_listings(neighborhood);
CREATE INDEX idx_listings_city ON property_listings(city);
CREATE INDEX idx_listings_price ON property_listings(price);
CREATE INDEX idx_listings_m2 ON property_listings(m2_total);
CREATE INDEX idx_listings_rooms ON property_listings(rooms);
CREATE INDEX idx_listings_status ON property_listings(status);

-- ============================================================
-- SELLER_PROPERTIES — Propriedades dos vendedores
-- ============================================================
CREATE TABLE seller_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT DEFAULT 'Buenos Aires',
  m2_total NUMERIC NOT NULL,
  m2_covered NUMERIC,
  rooms INT NOT NULL,
  bathrooms INT NOT NULL,
  parking INT DEFAULT 0,
  amenities JSONB DEFAULT '{}',
  target_price_min NUMERIC,
  target_price_max NUMERIC,
  currency currency_type DEFAULT 'USD',
  urgency urgency_level DEFAULT 'medium',
  status seller_property_status DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRICE_ANALYSES — Análises de preço para vendedores
-- ============================================================
CREATE TABLE price_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES seller_properties(id) ON DELETE CASCADE,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  comparables JSONB,
  price_per_m2_avg NUMERIC,
  price_per_m2_min NUMERIC,
  price_per_m2_max NUMERIC,
  estimated_price_min NUMERIC,
  estimated_price_max NUMERIC,
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  observations TEXT
);

-- ============================================================
-- PROPERTY_OPPORTUNITIES — Oportunidades para compradores
-- ============================================================
CREATE TABLE property_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  preference_id UUID NOT NULL REFERENCES search_preferences(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL CHECK (match_score BETWEEN 0 AND 1),
  opportunity_score NUMERIC NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (listing_id, preference_id)
);

-- ============================================================
-- MESSAGES — Mensagens entre agentes e clientes
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES property_listings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_receiver ON messages(receiver_id, read_at);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: cada um vê o próprio + agente vê os seus clientes
CREATE POLICY "profiles_own" ON profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "agent_sees_clients" ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_clients
      WHERE agent_id = auth.uid() AND client_id = profiles.id
    )
  );

-- Agent clients: agente gerencia os seus
CREATE POLICY "agent_clients_policy" ON agent_clients FOR ALL
  USING (agent_id = auth.uid() OR client_id = auth.uid());

-- Search preferences: usuário vê as suas + agente vê as do cliente
CREATE POLICY "search_prefs_own" ON search_preferences FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "agent_sees_client_prefs" ON search_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_clients
      WHERE agent_id = auth.uid() AND client_id = search_preferences.user_id
    )
  );

-- Property listings: todos autenticados podem ver
CREATE POLICY "listings_read" ON property_listings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seller properties: próprio + agente do vendedor
CREATE POLICY "seller_props_own" ON seller_properties FOR ALL
  USING (seller_id = auth.uid());

CREATE POLICY "agent_sees_seller_props" ON seller_properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_clients
      WHERE agent_id = auth.uid() AND client_id = seller_properties.seller_id
    )
  );

-- Price analyses: via seller_properties
CREATE POLICY "price_analyses_policy" ON price_analyses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM seller_properties
      WHERE id = price_analyses.property_id AND seller_id = auth.uid()
    )
  );

-- Opportunities: via search_preferences
CREATE POLICY "opportunities_policy" ON property_opportunities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM search_preferences
      WHERE id = property_opportunities.preference_id AND user_id = auth.uid()
    )
  );

-- Messages: sender ou receiver
CREATE POLICY "messages_policy" ON messages FOR ALL
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
