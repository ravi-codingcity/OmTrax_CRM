import Header from './Header';

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
