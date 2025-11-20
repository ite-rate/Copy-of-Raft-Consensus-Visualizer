import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ConceptCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  details?: React.ReactNode;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ title, description, icon, details }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-3">{description}</p>
          
          {details && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-indigo-600 text-sm font-medium flex items-center hover:text-indigo-700"
            >
              {expanded ? 'Less Details' : 'More Details'}
              <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      </div>
      
      {expanded && details && (
        <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-700 bg-slate-50 rounded-md p-3">
          {details}
        </div>
      )}
    </div>
  );
};

export default ConceptCard;