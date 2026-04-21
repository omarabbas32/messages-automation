import { useState, useEffect } from 'react';
import MainLayout from './layouts/MainLayout';
import DashboardOverview from './components/Dashboard/DashboardOverview';
import PagesSection from './sections/PagesSection';
import RulesSection from './sections/RulesSection';
import SettingsPage from './components/SettingsPage/SettingsPage';
import LoginPage from './sections/Auth/LoginPage';
import RegisterPage from './sections/Auth/RegisterPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, isLoading, refreshSession } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-wink-black min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-wink-gray-700 border-t-wink-white rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-wink-white font-bold tracking-tight uppercase">Wink is waking up...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' 
      ? <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
      : <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />;
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { getToken, logout, refreshSession, user } = useAuth();
  const [pages, setPages] = useState([]);
  const [allRules, setAllRules] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'settings'
  const [userSettings, setUserSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Central API Fetch Wrapper with Automatic Refresh
  const apiFetch = async (url, options = {}) => {
    const execute = async (token) => {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        };
        
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        return fetch(url, { ...options, headers });
    };

    try {
      let token = await getToken();
      let response = await execute(token);
      
      if (response.status === 401) {
          console.warn("🔐 Access token expired, attempting refresh...");
          await refreshSession(); 
          token = await getToken();
          if (token) {
              response = await execute(token);
          }
      }

      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`API Fetch Error (${url}):`, error);
      throw error;
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const [pagesRes, rulesRes, settingsRes] = await Promise.all([
        apiFetch('/api/pages'),
        apiFetch('/api/rules'),
        apiFetch('/api/user/settings')
      ]);

      if (pagesRes.success) setPages(pagesRes.data);
      if (rulesRes.success) setAllRules(rulesRes.data);
      if (settingsRes.success) setUserSettings(settingsRes.data);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSettings = async () => {
    try {
      const result = await apiFetch('/api/user/settings');
      if (result.success) setUserSettings(result.data);
    } catch (error) {}
  };

  // Page handlers
  const handleUpdateAI = async (id, aiData) => {
    try {
      const result = await apiFetch(`/api/pages/${id}/ai`, {
        method: 'PUT',
        body: JSON.stringify(aiData)
      });
      if (result.success) {
        setPages(prev => prev.map(p => p.id === id ? { ...p, ...aiData } : p));
        return true;
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
      return false;
    }
  };

  const handleUpdateKnowledge = async (id, knowledge) => {
    try {
      const result = await apiFetch(`/api/pages/${id}/knowledge`, {
        method: 'PUT',
        body: JSON.stringify({ knowledge_base: knowledge })
      });
      if (result.success) {
        setPages(prev => prev.map(p => p.id === id ? { ...p, knowledge_base: knowledge } : p));
        return true;
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
      return false;
    }
  };

  const handleUpdatePage = async (id, pageData) => {
    try {
      const result = await apiFetch(`/api/pages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(pageData)
      });
      if (result.success) {
        setPages(prev => prev.map(p => p.id === id ? { ...p, ...pageData } : p));
        return true;
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
      return false;
    }
  };

  const handleAddPage = async (pageData) => {
    try {
      const result = await apiFetch('/api/pages', {
        method: 'POST',
        body: JSON.stringify(pageData)
      });

      if (result.success) {
        fetchInitialData();
        window.Swal.fire({ title: 'Success!', text: 'Page added successfully', icon: 'success' });
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
    }
  };

  const handleBulkConnect = async (pages) => {
    try {
      const result = await apiFetch('/api/pages/bulk', {
        method: 'POST',
        body: JSON.stringify({ pages })
      });

      if (result.success) {
        fetchInitialData();
        window.Swal.fire({ 
            title: 'Success!', 
            text: `${pages.length} pages connected and automated.`, 
            icon: 'success' 
        });
        return true;
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
      return false;
    }
  };

  const handleUploadInventory = async (pageId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiFetch(`/api/pages/${pageId}/inventory/upload`, {
        method: 'POST',
        body: formData
      });

      if (result.success) {
        window.Swal.fire('Inventory Refreshed!', result.message, 'success');
        return true;
      }
    } catch (error) {
      window.Swal.fire('Upload Failed', error.message, 'error');
      return false;
    }
  };

  const handleDeletePage = async (id, name) => {
    window.Swal.fire({
      title: 'Are you sure?',
      text: `Delete "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000',
      cancelButtonColor: '#eee',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await apiFetch(`/api/pages/${id}`, { method: 'DELETE' });
          if (res.success) {
            setPages(prev => prev.filter(p => p.id !== id));
            window.Swal.fire('Deleted!', 'Page removed.', 'success');
          }
        } catch (error) {
          window.Swal.fire('Error', error.message, 'error');
        }
      }
    });
  };

  const handleAddRule = async (ruleData) => {
    try {
      const result = await apiFetch('/api/rules', {
        method: 'POST',
        body: JSON.stringify(ruleData)
      });
      if (result.success) {
        fetchInitialData();
        window.Swal.fire('Rule Added!', 'Automation created.', 'success');
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      const res = await apiFetch(`/api/rules/${id}`, { method: 'DELETE' });
      if (res.success) {
        setAllRules(prev => prev.filter(r => r.id !== id));
        window.Swal.fire('Deleted!', 'Rule removed.', 'success');
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
    }
  };

  const handleUpdateSettings = async (settingsData) => {
    try {
      const result = await apiFetch('/api/user/settings', {
        method: 'PATCH',
        body: JSON.stringify(settingsData)
      });
      if (result.success) {
        window.Swal.fire('Settings Saved', '', 'success');
        fetchUserSettings();
        return true;
      }
    } catch (error) {
      window.Swal.fire('Error', error.message, 'error');
      return false;
    }
  };

  const handleGetFBAuthUrl = async () => {
    try {
      const result = await apiFetch('/api/auth/facebook/url');
      return result.success ? result.url : null;
    } catch (error) {
      console.error('Failed to get FB Auth URL:', error);
      return null;
    }
  };

  const handleGetIGAuthUrl = async () => {
    try {
      const result = await apiFetch('/api/auth/instagram/url');
      return result.success ? result.url : null;
    } catch (error) {
      console.error('Failed to get IG Auth URL:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 min-h-screen bg-wink-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-wink-gray-200 border-t-wink-black rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-wink-gray-500 font-medium">Fetching your workspace...</h2>
        </div>
      </div>
    );
  }

  return (
    <MainLayout
      activeView={activeView}
      onNavigate={setActiveView}
      onLogout={logout}
      userEmail={user.email}
    >
      {activeView === 'dashboard' ? (
        <div className="space-y-12">
          <DashboardOverview pages={pages} />
          
          <PagesSection 
            pages={pages} 
            onAddPage={handleAddPage}
            onBulkConnect={handleBulkConnect}
            onGetFBAuthUrl={handleGetFBAuthUrl}
            onGetIGAuthUrl={handleGetIGAuthUrl}
            onDeletePage={handleDeletePage}
            onUpdateAI={handleUpdateAI}
            onUpdateKnowledge={handleUpdateKnowledge}
            onUpdatePage={handleUpdatePage}
            onUploadInventory={handleUploadInventory}
          />

          <RulesSection
            pages={pages}
            rules={allRules}
            selectedPageId={selectedPageId}
            onSelectPage={setSelectedPageId}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        </div>
      ) : (
        <SettingsPage 
          settings={userSettings} 
          onUpdateSettings={handleUpdateSettings}
        />
      )}
    </MainLayout>
  );
}

export default App;
