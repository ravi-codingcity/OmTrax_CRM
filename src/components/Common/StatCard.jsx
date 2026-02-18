const StatCard = ({ title, value, icon, color, subtext }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    orange: 'from-orange-500 to-orange-600',
    teal: 'from-teal-500 to-teal-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} rounded-xl p-2 sm:p-4 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-[10px] sm:text-xs font-medium uppercase tracking-wide">{title}</p>
          <p className="text-lg sm:text-2xl font-bold mt-1">{value}</p>
          {subtext && <p className="text-white/70 text-[10px] sm:text-xs mt-1">{subtext}</p>}
        </div>
        <div className="bg-white/20 p-1.5 sm:p-2.5 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
