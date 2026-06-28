import AnnouncementBar from "./AnnouncementBar";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface NavbarLayoutProps {
  children: React.ReactNode;
}

export default function NavbarLayout({ children }: NavbarLayoutProps) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      {/* 40px announcement bar + 72px navbar = 112px total fixed header */}
      <main style={{ paddingTop: "112px" }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
