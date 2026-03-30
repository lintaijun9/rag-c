'use client';

import React from 'react';
import { useI18n, Locale } from '@/lib/i18n';
import { useTheme, Theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { success } = useToast();

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
    success(t('common.success'));
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    success(t('common.success'));
  };

  const handleLogout = () => {
    success(t('settings.logout') + ' - ' + t('common.success'));
    // In a real app, you would clear tokens and redirect to login
    // For this prototype, we just show a toast
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>{t('settings.title')}</h1>
      </div>

      <div className="settings-content">
        <section className="settings-section">
          <h2>{t('settings.language')}</h2>
          <Card>
            <div className="setting-options">
              <Button 
                variant={locale === 'zh' ? 'primary' : 'secondary'} 
                onClick={() => handleLanguageChange('zh')}
              >
                中文 (简体)
              </Button>
              <Button 
                variant={locale === 'en' ? 'primary' : 'secondary'} 
                onClick={() => handleLanguageChange('en')}
              >
                English
              </Button>
            </div>
          </Card>
        </section>

        <section className="settings-section">
          <h2>{t('settings.theme')}</h2>
          <Card>
            <div className="setting-options">
              <Button 
                variant={theme === 'light' ? 'primary' : 'secondary'} 
                onClick={() => handleThemeChange('light')}
              >
                {t('settings.themeLight')}
              </Button>
              <Button 
                variant={theme === 'dark' ? 'primary' : 'secondary'} 
                onClick={() => handleThemeChange('dark')}
              >
                {t('settings.themeDark')}
              </Button>
              <Button 
                variant={theme === 'system' ? 'primary' : 'secondary'} 
                onClick={() => handleThemeChange('system')}
              >
                {t('settings.themeSystem')}
              </Button>
            </div>
          </Card>
        </section>

        <section className="settings-section">
          <h2>{t('settings.user')}</h2>
          <Card>
            <div className="user-info">
              <div className="avatar">A</div>
              <div className="user-details">
                <h3>Admin User</h3>
                <p>admin@example.com</p>
              </div>
              <Button variant="danger" onClick={handleLogout} className="logout-btn">
                {t('settings.logout')}
              </Button>
            </div>
          </Card>
        </section>
        
        <section className="settings-section">
           <h2>{t('settings.about')}</h2>
           <Card>
               <div className="about-info">
                   <p><strong>{t('settings.version')}:</strong> 1.0.0</p>
                   <p><strong>Powered by:</strong> Google Gemini File Search API</p>
               </div>
           </Card>
        </section>
      </div>

      <style jsx>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
          max-width: 800px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: var(--font-weight-bold);
        }

        .settings-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl);
        }

        .settings-section h2 {
          font-size: var(--font-size-body);
          font-weight: var(--font-weight-medium);
          margin-bottom: var(--spacing-md);
          color: var(--text-secondary);
        }

        .setting-options {
          display: flex;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-xl);
        }

        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background-color: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: var(--font-weight-bold);
        }

        .user-details {
          flex: 1;
        }

        .user-details h3 {
          font-size: var(--font-size-body);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--spacing-xs);
        }

        .user-details p {
          color: var(--text-secondary);
          font-size: var(--font-size-small);
        }

        .logout-btn {
          margin-left: auto;
        }
        
        .about-info {
           display: flex;
           flex-direction: column;
           gap: var(--spacing-md);
        }
        .about-info p {
            color: var(--text-primary);
        }
        .about-info strong {
            margin-right: var(--spacing-xs);
            color: var(--text-secondary);
        }

        @media (max-width: 600px) {
          .user-info {
            flex-direction: column;
            text-align: center;
            align-items: center;
            gap: var(--spacing-md);
          }
          
          .logout-btn {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
