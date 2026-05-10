import React from 'react';
import { Heart, ExternalLink, Github, Code2, Sparkles } from 'lucide-react';
import './Credits.css';

interface CreditLink {
  label: string;
  url: string;
  description: string;
  icon: React.ReactNode;
}

const links: CreditLink[] = [
  {
    label: 'gallery-dl',
    url: 'https://github.com/mikf/gallery-dl',
    description: 'Command-line program to download image galleries and collections from several image hosting sites — the core engine powering this app.',
    icon: <Code2 size={20} />,
  },
  {
    label: 'Gallery-DL Studio',
    url: 'https://github.com/AndrewImm-OP/gallery-dl-UI',
    description: 'Beautiful desktop GUI for gallery-dl. Open source, free, and community-driven.',
    icon: <Sparkles size={20} />,
  },
];

const techStack = [
  { name: 'Electron', url: 'https://www.electronjs.org/' },
  { name: 'React', url: 'https://react.dev/' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
  { name: 'Vite', url: 'https://vitejs.dev/' },
  { name: 'Zustand', url: 'https://zustand-demo.pmnd.rs/' },
  { name: 'Lucide Icons', url: 'https://lucide.dev/' },
  { name: 'Framer Motion', url: 'https://www.framer.com/motion/' },
];

export const Credits: React.FC = () => {
  const handleOpenUrl = (url: string) => {
    window.electronAPI?.openExternal?.(url);
  };

  return (
    <div className="credits-page">
      <div className="credits-page__header">
        <div className="credits-page__header-left">
          <h1 className="credits-page__title">
            <Heart size={24} />
            Credits
          </h1>
          <p className="credits-page__subtitle">
            Made with love. Open source forever.
          </p>
        </div>
      </div>

      <div className="credits-page__content">
        {/* Main credits */}
        <section className="credits-page__section">
          <h2 className="credits-page__section-title">Project</h2>
          <div className="credits-page__links">
            {links.map((link) => (
              <button
                key={link.url}
                className="credits-page__card"
                onClick={() => handleOpenUrl(link.url)}
              >
                <div className="credits-page__card-icon">{link.icon}</div>
                <div className="credits-page__card-body">
                  <div className="credits-page__card-header">
                    <span className="credits-page__card-name">{link.label}</span>
                    <ExternalLink size={14} className="credits-page__card-external" />
                  </div>
                  <p className="credits-page__card-desc">{link.description}</p>
                  <span className="credits-page__card-url">{link.url.replace('https://', '')}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section className="credits-page__section">
          <h2 className="credits-page__section-title">Built With</h2>
          <div className="credits-page__tech">
            {techStack.map((tech) => (
              <button
                key={tech.name}
                className="credits-page__tech-badge"
                onClick={() => handleOpenUrl(tech.url)}
              >
                {tech.name}
                <ExternalLink size={11} />
              </button>
            ))}
          </div>
        </section>

        {/* Special thanks */}
        <section className="credits-page__section">
          <h2 className="credits-page__section-title">Special Thanks</h2>
          <div className="credits-page__thanks-list">
            <div className="credits-page__thanks-item">
              <span className="credits-page__thanks-name">mikf</span>
              <span className="credits-page__thanks-role">Creator of gallery-dl, the incredible tool that makes all of this possible. Supporting 180+ sites with constant updates and excellent quality.</span>
            </div>
            <div className="credits-page__thanks-item">
              <span className="credits-page__thanks-name">Siright</span>
              <span className="credits-page__thanks-role">Constant support and encouragement throughout the development.</span>
            </div>
            <div className="credits-page__thanks-item">
              <span className="credits-page__thanks-name">Carunocat</span>
              <span className="credits-page__thanks-role">The original spark behind this project — the idea and inspiration that set everything in motion.</span>
            </div>
            <div className="credits-page__thanks-item">
              <span className="credits-page__thanks-name">AndrewImm-OP</span>
              <span className="credits-page__thanks-role">Lead developer, architect, and — let's be honest — an absolutely fucking awesome person being. That's me, by the way =D</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="credits-page__footer">
          <Github size={16} />
          <span>Gallery-DL Studio is open source software</span>
          <span className="credits-page__footer-sep">·</span>
          <span>MIT License</span>
        </div>
      </div>
    </div>
  );
};
