/* IsshoHub — Supabase client + auth */
(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://eupqbbfbucdkhtpsuvry.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1cHFiYmZidWNka2h0cHN1dnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNzYyNTUsImV4cCI6MjA5Mjc1MjI1NX0.Ax6QGerRyM4dUTJQT6dleOQfnwYJIPwqw4zLHdTfOhk';

  // Wait for Supabase CDN to load
  function getClient() {
    if (!global._supabaseClient) {
      const { createClient } = global.supabase;
      global._supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return global._supabaseClient;
  }

  /* ── Auth helpers ── */
  async function signInWithEmail(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signUpWithEmail(email, password, name) {
    const { data, error } = await getClient().auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    return { data, error };
  }

  async function signInWithGoogle() {
    const { data, error } = await getClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    return { data, error };
  }

  async function signOut() {
    const { error } = await getClient().auth.signOut();
    return { error };
  }

  async function getUser() {
    const { data: { user } } = await getClient().auth.getUser();
    return user;
  }

  async function getProfile(userId) {
    const { data, error } = await getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  }

  async function isAdmin() {
    const user = await getUser();
    if (!user) return false;
    /* Check user_metadata first (same as core.js) — avoids extra DB round-trip */
    if (user.user_metadata?.role === 'admin') return true;
    const { data } = await getProfile(user.id);
    return data?.role === 'admin';
  }

  async function resetPassword(email) {
    const { data, error } = await getClient().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    return { data, error };
  }

  /* ── Auth state change listener ── */
  function onAuthChange(callback) {
    getClient().auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  /* ── Content API ── */
  async function fetchCategories() {
    const { data, error } = await getClient()
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    return { data, error };
  }

  async function fetchArticles(options = {}) {
    let query = getClient()
      .from('articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (options.category) query = query.or(`category_key.eq.${options.category},category_keys.cs.{${options.category}}`);
    if (options.featured) query = query.eq('featured', true);
    if (options.limit)    query = query.limit(options.limit);

    const { data, error } = await query;
    return { data, error };
  }

  /* Admin: fetch all articles regardless of status */
  async function fetchAllArticles(options = {}) {
    let query = getClient()
      .from('articles')
      .select('id, slug, title_tc, title_en, category_key, sub_category_key, status, published_at, updated_at, featured, author')
      .order('updated_at', { ascending: false })
      .range(0, 999);
    if (options.category) query = query.eq('category_key', options.category);
    if (options.status)   query = query.eq('status', options.status);
    if (options.limit)    query = query.limit(options.limit);
    const { data, error } = await query;
    return { data: data || [], error };
  }

  async function deleteArticle(id) {
    const { error } = await getClient().from('articles').delete().eq('id', id);
    return { error };
  }

  async function searchArticles(query, options = {}) {
    const q = (query || '').trim();
    if (!q) return { data: [], error: null };
    const { data, error } = await getClient()
      .from('articles')
      .select('id, slug, title_tc, title_en, excerpt_tc, excerpt_en, cover_image_url, category_key, published_at, read_time, author')
      .eq('status', 'published')
      .or(`title_tc.ilike.%${q}%,title_en.ilike.%${q}%,excerpt_tc.ilike.%${q}%,excerpt_en.ilike.%${q}%`)
      .order('published_at', { ascending: false })
      .limit(options.limit || 20);
    return { data: data || [], error };
  }

  async function fetchArticle(slug) {
    const { data, error } = await getClient()
      .from('articles')
      .select('*')
      .eq('slug', slug)
      .single();
    return { data, error };
  }

  /* Fetch multiple articles by slug array, preserving order */
  async function fetchArticlesBySlug(slugs) {
    if (!slugs || !slugs.length) return { data: [], error: null };
    const { data, error } = await getClient()
      .from('articles')
      .select('*')
      .in('slug', slugs)
      .eq('status', 'published');
    /* Preserve the order specified by slugs array */
    const ordered = slugs.map(s => (data || []).find(a => a.slug === s)).filter(Boolean);
    return { data: ordered, error };
  }

  async function fetchHotSearches() {
    const { data, error } = await getClient()
      .from('hot_searches')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    return { data, error };
  }

  async function fetchSiteSettings() {
    const { data, error } = await getClient()
      .from('site_settings')
      .select('*');
    return { data, error };
  }

  /* ── Member: saved articles ── */
  async function saveArticle(articleId) {
    const user = await getUser();
    if (!user) return { error: { message: 'Not logged in' } };
    const { data, error } = await getClient()
      .from('saved_articles')
      .insert({ user_id: user.id, article_id: articleId });
    return { data, error };
  }

  async function unsaveArticle(articleId) {
    const user = await getUser();
    if (!user) return { error: { message: 'Not logged in' } };
    const { error } = await getClient()
      .from('saved_articles')
      .delete()
      .eq('user_id', user.id)
      .eq('article_id', articleId);
    return { error };
  }

  async function getSavedArticles() {
    const user = await getUser();
    if (!user) return { data: [], error: null };
    const { data, error } = await getClient()
      .from('saved_articles')
      .select('article_id, articles(*)')
      .eq('user_id', user.id);
    return { data, error };
  }

  /* ── Admin: write helpers ── */
  async function upsertArticle(article) {
    const { data, error } = await getClient()
      .from('articles')
      .upsert(article)
      .select()
      .single();
    return { data, error };
  }

  async function updateSiteSettings(key, valueTc, valueEn) {
    const { data, error } = await getClient()
      .from('site_settings')
      .upsert({ key, value_tc: valueTc, value_en: valueEn, updated_at: new Date().toISOString() });
    return { data, error };
  }

  async function upsertHotSearch(item) {
    const { data, error } = await getClient()
      .from('hot_searches')
      .upsert(item)
      .select()
      .single();
    return { data, error };
  }

  async function deleteHotSearch(id) {
    const { error } = await getClient()
      .from('hot_searches')
      .delete()
      .eq('id', id);
    return { error };
  }

  /* ── Exports ── */
  global.IsshoAuth = {
    getClient,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    getUser,
    getProfile,
    isAdmin,
    resetPassword,
    onAuthChange,
  };

  global.IsshoAPI = {
    fetchCategories,
    fetchArticles,
    fetchAllArticles,
    fetchArticle,
    fetchArticlesBySlug,
    searchArticles,
    deleteArticle,
    fetchHotSearches,
    fetchSiteSettings,
    saveArticle,
    unsaveArticle,
    getSavedArticles,
    upsertArticle,
    updateSiteSettings,
    upsertHotSearch,
    deleteHotSearch,
  };

})(window);
