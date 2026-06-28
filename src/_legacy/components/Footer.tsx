import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-6 px-4 flex flex-col md:flex-row justify-center items-center gap-x-8 gap-y-4 text-default-800 text-[13px] border-t border-crafting-border bg-transparent shrink-0">
      <div className="flex items-center gap-2">
        <span>© 2025-2026 星狐攻略组</span>
      </div>
      <a
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary transition-colors"
      >
        沪ICP备2025152827号-1
      </a>
      <a
        href="https://github.com/aion2-interactive-map/aion2-interactive-map"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary transition-colors flex items-center gap-2"
      >
        <FontAwesomeIcon icon={faGithub} className="text-[18px]" />
        <span>GitHub</span>
      </a>
    </footer>
  );
};

export default Footer;
