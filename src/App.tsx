/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  ArrowRight, 
  Cake, 
  Cookie, 
  IceCream, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  Instagram, 
  Facebook, 
  ChevronLeft,
  ChevronRight,
  Quote,
  Clock, 
  MessageCircle,
  Truck,
  Zap,
  Store,
  Settings,
  Play,
  Image as ImageIcon,
  Menu,
  X,
  ShoppingBag,
  Search
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "@/src/lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc,
  where,
  getDocs
} from "firebase/firestore";
import AdminPortal from "@/src/components/AdminPortal";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

interface Product {
  id?: string;
  name: string;
  price: string;
  desc: string;
  img: string;
  category?: string;
}

interface SiteSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  logo: string;
  established: string;
  whatsappNumber: string;
  storyTitle: string;
  storySubtitle: string;
  storyDescription: string;
  storyImage: string;
  storyPoint1: string;
  storyPoint2: string;
  footerDescription: string;
  instagramUrl: string;
  facebookUrl: string;
  address: string;
  phone: string;
  email: string;
  workingHoursMonFri: string;
  workingHoursSat: string;
  workingHoursSun: string;
}

interface GalleryItem {
  id?: string;
  url: string;
  type: 'image' | 'video';
  createdAt?: string;
}

interface Testimonial {
  id?: string;
  name: string;
  text: string;
  rating: number;
  avatar?: string;
  createdAt?: string;
}

interface Order {
  id?: string;
  orderId: string;
  customerName?: string;
  status: "Processing" | "Baking" | "Out for Delivery" | "Delivered" | "Cancelled";
  itemsSummary?: string;
  estimatedDelivery?: string;
}

interface Category {
  id?: string;
  name: string;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    heroTitle: 'CRISP. SWEET. UNFORGETTABLE.',
    heroSubtitle: 'Experience the authentic taste of tradition. Handcrafted pastries made with premium ingredients and decades of passion.',
    heroImage: 'input_file_0.png',
    logo: '',
    established: 'Established 1998',
    whatsappNumber: '96893245138',
    storyTitle: 'Crafting Memories One Bite at a Time',
    storySubtitle: 'Since 1985',
    storyDescription: 'Started as a small family bakery, AK Sweets has grown into a destination for dessert lovers. Our secret lies in the balance of traditional craftsmanship and the highest quality ingredients sourced from around the globe.',
    storyImage: 'https://images.unsplash.com/photo-1495147466023-ac3c75325f3e?auto=format&fit=crop&q=80&w=1000',
    storyPoint1: 'Voted Best Bakery in Town 5 Years Running',
    storyPoint2: 'Over 1,000,000 Boxes Delivered Globally',
    footerDescription: 'Making the world a little sweeter, one bite at a time. Traditional recipes, premium ingredients, and lots of love.',
    instagramUrl: '#',
    facebookUrl: '#',
    address: '123 Sweet Lane, Pastry District, New York, NY 10001',
    phone: '+1 (555) 123-SWEET',
    email: 'hello@aksweets.com',
    workingHoursMonFri: '8:00 AM - 9:00 PM',
    workingHoursSat: '9:00 AM - 10:00 PM',
    workingHoursSun: '10:00 AM - 8:00 PM'
  });

  const WHATSAPP_LINK = `https://wa.me/${siteSettings.whatsappNumber}?text=Hello! I'd like to place an order from AK Sweets Shop.`;

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Tracking State
  const [searchOrderId, setSearchOrderId] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  const handleTrackOrder = async (e: any) => {
    e.preventDefault();
    if (!searchOrderId.trim()) return;

    setIsTracking(true);
    setTrackError("");
    setTrackedOrder(null);

    try {
      const q = query(collection(db, "orders"), where("orderId", "==", searchOrderId.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setTrackedOrder({ id: snapshot.docs[0].id, ...data } as Order);
      } else {
        setTrackError("No order found with this ID.");
      }
    } catch (err) {
      console.error(err);
      setTrackError("Failed to fetch order status. Please try again.");
    } finally {
      setIsTracking(false);
    }
  };

  const categories = ["All", ...dbCategories.map(c => c.name)];

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const pList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(pList);
      },
      (error) => {
        // Only log if it's not a permission error (which is expected for non-admins if rules were tighter)
        console.warn("Product feed coming from Firestore...");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "testimonials"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const tList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial));
        setTestimonials(tList);
      },
      (error) => {
        console.warn("Testimonials feed coming from Firestore...");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const cList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setDbCategories(cList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "categories");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const gList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
        setGallery(gList);
      },
      (error) => {
        console.warn("Gallery feed coming from Firestore...");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "main"), 
      (docSnap) => {
        if (docSnap.exists()) {
          setSiteSettings(docSnap.data() as any);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-brand-warm text-brand-primary" dir="ltr">
      <AdminPortal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-brand-primary/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col md:flex-row relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md hover:bg-brand-accent text-white md:text-brand-primary rounded-full transition-all z-10"
              >
                <X size={24} />
              </button>

              <div className="w-full md:w-1/2 h-[300px] md:h-auto bg-brand-muted relative group overflow-hidden">
                {selectedProduct.img ? (
                  <img src={selectedProduct.img} alt={selectedProduct.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Cake className="w-20 h-20 text-brand-primary/10" />
                  </div>
                )}
                {selectedProduct.category && (
                  <div className="absolute top-8 left-8 bg-brand-accent text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                    {selectedProduct.category}
                  </div>
                )}
              </div>

              <div className="flex-1 p-8 md:p-12 overflow-y-auto flex flex-col">
                <div className="mb-8">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-3xl md:text-4xl font-bold">{selectedProduct.name}</h2>
                    <div className="text-2xl font-bold text-brand-accent">{selectedProduct.price}</div>
                  </div>
                  <p className="text-brand-primary/60 text-lg leading-relaxed">{selectedProduct.desc}</p>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-4 p-4 bg-brand-warm/30 rounded-2xl border border-brand-border">
                    <div className="p-3 bg-white rounded-xl text-brand-accent">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Delivery Information</h4>
                      <p className="text-xs text-brand-primary/50">Standard shipping available nationwide. Freshly baked to order.</p>
                    </div>
                  </div>

                  <a 
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-5 bg-brand-primary text-white rounded-2xl font-bold text-lg hover:bg-brand-accent transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-primary/20 group"
                  >
                    <MessageCircle className="transition-transform group-hover:rotate-12" />
                    Order via WhatsApp
                  </a>
                </div>

                {/* Related Products Section */}
                <div className="mt-auto border-t border-brand-border pt-10">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Sparkles className="text-brand-accent" size={20} />
                    You might also like
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {products
                      .filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id)
                      .slice(0, 2)
                      .map(related => (
                        <div 
                          key={related.id}
                          onClick={() => setSelectedProduct(related)}
                          className="flex items-center gap-3 p-3 bg-brand-muted/30 rounded-2xl border border-transparent hover:border-brand-accent/30 hover:bg-white transition-all cursor-pointer group"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-brand-border">
                            {related.img ? (
                              <img src={related.img} alt={related.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full bg-brand-muted flex items-center justify-center">
                                <Cake className="w-6 h-6 text-brand-primary/10" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm truncate max-w-[120px]">{related.name}</div>
                            <div className="text-brand-accent text-xs font-bold">{related.price}</div>
                          </div>
                        </div>
                      ))}
                    {products.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).length === 0 && (
                      <div className="col-span-full py-4 text-center bg-brand-muted/20 rounded-xl border border-brand-border border-dashed">
                        <p className="text-xs text-brand-primary/40 font-bold uppercase tracking-wider">More coming soon!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-brand-warm/80 backdrop-blur-md border-b border-brand-border h-20">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {siteSettings.logo ? (
              <img src={siteSettings.logo} alt="AK SWEETS" className="h-8 md:h-10 w-auto" referrerPolicy="no-referrer" />
            ) : (
              <>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-accent rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="text-xl md:text-2xl font-bold tracking-tighter text-brand-primary">
                  AK SWEETS
                </div>
              </>
            )}
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium uppercase tracking-wider">
            <div className="relative group mr-4">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search treats..."
                className="bg-brand-muted/50 border border-brand-border rounded-full py-2 pl-10 pr-4 text-xs font-bold outline-none focus:border-brand-accent focus:bg-white transition-all w-40 focus:w-64"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
            </div>

            <div className="flex items-center gap-8 opacity-70">
              <a href="#about" className="hover:text-brand-accent transition-colors">Our Story</a>
              <a href="#products" className="hover:text-brand-accent transition-colors">Products</a>
              <a href="#tracking" className="hover:text-brand-accent transition-colors">Track Order</a>
              <a href="#gallery" className="hover:text-brand-accent transition-colors">Gallery</a>
            </div>
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-brand-accent text-white px-6 py-2 rounded-full hover:bg-brand-primary transition-all flex items-center gap-2"
            >
              <MessageCircle size={18} />
              Order Online
            </a>
            <button 
              onClick={() => setIsAdminOpen(true)}
              className="p-2 text-brand-primary/40 hover:text-brand-accent transition-colors"
              title="Admin Portal"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-4">
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-brand-accent text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
              title="Quick Shop"
            >
              <ShoppingBag size={20} />
            </a>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-10 h-10 flex items-center justify-center text-brand-primary border border-brand-border rounded-xl"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-brand-border overflow-hidden"
            >
              <div className="px-6 py-8 space-y-6 flex flex-col">
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sweets..."
                    className="w-full bg-brand-muted/50 border border-brand-border rounded-2xl py-4 pl-12 pr-4 text-lg font-bold outline-none focus:border-brand-accent focus:bg-white transition-all"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-primary/30" />
                </div>
                <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold hover:text-brand-accent">Our Story</a>
                <a href="#products" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold hover:text-brand-accent">Products</a>
                <a href="#tracking" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold hover:text-brand-accent">Track Order</a>
                <a href="#gallery" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-bold hover:text-brand-accent">Gallery</a>
                <a 
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand-accent text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg"
                >
                  <MessageCircle size={24} />
                  Shop All Sweets
                </a>
                <div className="pt-6 border-t border-brand-border flex justify-between items-center text-brand-primary/40 font-bold text-xs uppercase tracking-widest">
                   <span>Admin Access</span>
                   <button onClick={() => { setIsAdminOpen(true); setIsMobileMenuOpen(false); }} className="p-3 bg-brand-muted rounded-xl text-brand-primary">
                     <Settings size={20} />
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
            {siteSettings.heroImage && (
              <img 
                src={siteSettings.heroImage} 
                alt="AK Sweets Premium Collection" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          <div className="absolute inset-0 bg-brand-primary/40 backdrop-blur-[1px]" />
        </div>

        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1 bg-brand-accent text-white text-xs font-bold uppercase tracking-[0.2em] rounded-full mb-4">
              {siteSettings.established}
            </span>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] whitespace-pre-line">
              {siteSettings.heroTitle}
            </h1>
            <p className="text-lg md:text-xl font-light mb-10 opacity-90 leading-relaxed max-w-2xl mx-auto">
              {siteSettings.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto bg-brand-accent text-white font-bold px-10 py-4 rounded-full text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
                Explore Products
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Pinterest-style Gallery Section */}
      <section id="gallery" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-brand-accent font-bold uppercase tracking-widest text-sm mb-2 block">Our Sweet Collection</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Sweet Inspirations</h2>
          <p className="text-brand-primary/60 max-w-2xl mx-auto">Browse our handcrafted delights. From classic recipes to modern creations.</p>
        </div>
        
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {gallery.length > 0 ? (
            gallery.map((item, i) => (
              <motion.div 
                key={item.id || i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative break-inside-avoid rounded-3xl overflow-hidden group mb-4 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-zoom-in group"
              >
                {item.type === 'video' ? (
                  <div className="relative aspect-[4/5] bg-black">
                    <video 
                      src={item.url} 
                      className="w-full h-full object-cover"
                      muted 
                      loop 
                      playsInline
                      autoPlay
                      onClick={e => {
                        const v = e.currentTarget;
                        if (v.paused) v.play();
                        else v.pause();
                      }}
                    />
                    <div className="absolute top-4 right-4 bg-brand-accent/80 backdrop-blur-md p-2 rounded-full text-white pointer-events-none">
                      <Play size={12} fill="currentColor" />
                    </div>
                  </div>
                ) : (
                  item.url ? (
                    <img 
                      src={item.url} 
                      alt={`Gallery ${i}`} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-brand-muted flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-brand-primary/10" />
                    </div>
                  )
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-6 text-white">
                  <div className="flex justify-end">
                    <button className="bg-brand-accent text-white p-3 rounded-full hover:scale-110 transition-transform">
                      <Star size={20} fill="currentColor" />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">{item.type === 'video' ? 'Action Treat' : 'Deluxe Treat'}</h4>
                    <p className="text-xs text-white/80">Handcrafted with premium ingredients</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            // Placeholder if gallery is empty
            [
              "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1535141192574-5d4897c12636?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800",
              "https://images.unsplash.com/photo-1499195333224-3ce974eecfb4?auto=format&fit=crop&q=80&w=800"
            ].map((img, i) => (
              <div key={i} className="aspect-square rounded-3xl overflow-hidden group mb-4">
                <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover grayscale" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Delivery Section */}
      <div className="bg-white border-y border-brand-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Nationwide Fresh Delivery</h3>
              <p className="text-brand-primary/50 text-sm">We ensure every box reaches you in perfect condition.</p>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Truck className="text-brand-accent w-6 h-6" />
                <span className="font-bold">Standard Shipping</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-brand-accent w-6 h-6" />
                <span className="font-bold">Wait Time: 3-5 Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <section id="products" className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div {...fadeIn} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Signature Sweets</h2>
          <p className="text-brand-primary/60 max-w-2xl mx-auto">Discover the most popular treats that our customers fall in love with daily.</p>
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-3 rounded-full font-bold text-sm transition-all ${
                activeCategory === cat 
                ? "bg-brand-accent text-white shadow-lg scale-105" 
                : "bg-white border border-brand-border text-brand-primary hover:border-brand-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product, i) => (
              <motion.div 
                key={product.id || i}
                whileHover={{ y: -10 }}
                onClick={() => setSelectedProduct(product)}
                className="bg-white rounded-[2rem] overflow-hidden border border-brand-border shadow-sm group hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="h-60 overflow-hidden relative">
                  {product.img ? (
                    <img src={product.img} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-brand-muted flex items-center justify-center">
                      <Cake className="w-12 h-12 text-brand-primary/10" />
                    </div>
                  )}
                  {product.category && (
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-accent shadow-sm">
                      {product.category}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl">{product.name}</h3>
                    <span className="text-brand-accent font-bold">{product.price}</span>
                  </div>
                  <p className="text-sm text-brand-primary/60 line-clamp-2">{product.desc}</p>
                  
                  {/* Product Delivery Badges */}
                  <div className="mt-4 flex flex-wrap gap-2">
                     <div className="flex items-center gap-1 text-[10px] bg-brand-muted px-2 py-1 rounded-md text-brand-primary/70" title="Freshness Guaranteed">
                       <Sparkles size={10} /> Signature Bake
                     </div>
                     <div className="flex items-center gap-1 text-[10px] bg-brand-accent/10 px-2 py-1 rounded-md text-brand-accent" title="Standard Shipping Only">
                       <Truck size={10} /> Standard Delivery
                     </div>
                  </div>

                  <a 
                    href={WHATSAPP_LINK} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 w-full py-3 rounded-xl border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white transition-all font-bold text-sm inline-flex justify-center items-center gap-2 group"
                  >
                    <MessageCircle size={18} className="transition-transform group-hover:rotate-12" />
                    Order via WhatsApp
                  </a>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-brand-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-brand-primary/20" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No treats found</h3>
              <p className="text-brand-primary/40">Try adjusting your search or category filter to find what you're looking for.</p>
              <button 
                onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                className="mt-8 text-brand-accent font-bold underline underline-offset-4"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </section>


      {/* Story Section */}
      <section id="about" className="py-24 bg-brand-muted/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 md:order-1"
          >
            <div className="relative">
              <img 
                src={siteSettings.storyImage} 
                alt="Bakers at work" 
                className="rounded-[2.5rem] shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-6 -right-6 w-full h-full border-2 border-brand-accent rounded-[2.5rem] z-0" />
            </div>
          </motion.div>
          <motion.div {...fadeIn} className="order-1 md:order-2">
            <span className="text-brand-accent font-bold uppercase tracking-widest text-sm mb-4 block">{siteSettings.storySubtitle}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight whitespace-pre-line">{siteSettings.storyTitle}</h2>
            <p className="text-brand-primary/70 mb-6 leading-relaxed">
              {siteSettings.storyDescription}
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Star className="w-5 h-5" />
                </div>
                <span className="font-medium">{siteSettings.storyPoint1}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                  <Cookie className="w-5 h-5" />
                </div>
                <span className="font-medium">{siteSettings.storyPoint2}</span>
              </div>
            </div>
            <button className="mt-10 bg-brand-primary text-white px-8 py-4 rounded-full font-bold hover:bg-brand-accent transition-all flex items-center gap-2">
              Learn Our Full Story
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-brand-accent font-bold uppercase tracking-widest text-sm mb-2 block">Kind Words</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Customer Stories</h2>
            </div>

            <div className="relative max-w-4xl mx-auto">
              <div className="overflow-hidden rounded-[3rem] bg-brand-muted/10 p-12 md:p-20 relative">
                <Quote className="absolute top-12 left-12 w-24 h-24 text-brand-accent/[0.03] -z-0" />
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={testimonialIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5, ease: "anticipate" }}
                    className="relative z-10 text-center"
                  >
                    <div className="flex justify-center gap-1 text-brand-accent mb-8">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={20} fill={i < testimonials[testimonialIndex].rating ? 'currentColor' : 'none'} className={i < testimonials[testimonialIndex].rating ? '' : 'text-brand-primary/10'} />
                      ))}
                    </div>
                    
                    <p className="text-2xl md:text-3xl font-medium text-brand-primary/90 leading-relaxed mb-12">
                      "{testimonials[testimonialIndex].text}"
                    </p>

                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-muted mb-4 border-2 border-white shadow-lg">
                        {testimonials[testimonialIndex].avatar ? (
                          <img src={testimonials[testimonialIndex].avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-primary/20 bg-brand-muted">
                            <Star size={30} />
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-lg">{testimonials[testimonialIndex].name}</div>
                      <div className="text-sm text-brand-primary/40 uppercase tracking-widest font-bold mt-1">Verified Customer</div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation Controls */}
              <div className="flex justify-center gap-4 mt-12">
                <button 
                  onClick={() => setTestimonialIndex(prev => (prev - 1 + testimonials.length) % testimonials.length)}
                  className="w-14 h-14 rounded-full border border-brand-border flex items-center justify-center hover:bg-brand-accent hover:border-brand-accent hover:text-white transition-all group"
                >
                  <ChevronLeft className="w-6 h-6 transition-transform group-active:-translate-x-1" />
                </button>
                <div className="flex items-center gap-3">
                  {testimonials.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setTestimonialIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i === testimonialIndex ? 'w-8 bg-brand-accent' : 'w-2 bg-brand-primary/10'}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={() => setTestimonialIndex(prev => (prev + 1) % testimonials.length)}
                  className="w-14 h-14 rounded-full border border-brand-border flex items-center justify-center hover:bg-brand-accent hover:border-brand-accent hover:text-white transition-all group"
                >
                  <ChevronRight className="w-6 h-6 transition-transform group-active:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Order Tracking Section */}
      <section id="tracking" className="py-24 bg-brand-primary text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl -mr-48 -mt-48" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeIn}>
              <span className="text-brand-secondary font-bold uppercase tracking-widest text-sm mb-4 block underline decoration-brand-secondary/30 decoration-2 underline-offset-8">Stay Updated</span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Track Your Treats</h2>
              <p className="text-white/70 mb-10 text-lg leading-relaxed">
                Enter your unique Order ID to see real-time updates on your sweet delivery. From baking to your doorstep, follow every step of the journey.
              </p>
              
              <form onSubmit={handleTrackOrder} className="relative max-w-md">
                <input 
                  type="text" 
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Enter Order ID (e.g. AK-1234)" 
                  className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-brand-secondary transition-all text-white font-mono placeholder:text-white/30"
                />
                <button 
                  type="submit"
                  disabled={isTracking}
                  className="absolute right-2 top-2 bottom-2 bg-brand-secondary text-brand-primary px-6 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50"
                >
                  {isTracking ? "Checking..." : "Track Now"}
                </button>
              </form>
              {trackError && <p className="mt-4 text-red-400 font-medium">{trackError}</p>}
            </motion.div>

            <motion.div 
               key={trackedOrder?.orderId || "empty"}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-8 md:p-12 relative"
            >
              {trackedOrder ? (
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2 font-bold">Order Status</div>
                      <div className="text-3xl font-bold text-brand-secondary">{trackedOrder.status}</div>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-brand-secondary/20 flex items-center justify-center text-brand-secondary">
                      {trackedOrder.status === 'Delivered' ? <ShoppingBag /> : <Truck />}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-bold">Order ID</div>
                      <div className="font-mono text-lg">{trackedOrder.orderId}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1 font-bold">Est. Arrival</div>
                      <div className="text-lg">{trackedOrder.estimatedDelivery || "Calculating..."}</div>
                    </div>
                  </div>

                  {trackedOrder.itemsSummary && (
                    <div className="pt-6 border-t border-white/10">
                      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-bold">Items</div>
                      <p className="text-sm text-white/70 italic">"{trackedOrder.itemsSummary}"</p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="pt-8">
                    <div className="flex justify-between text-[10px] uppercase tracking-tighter text-white/30 font-bold mb-4">
                      <span>Received</span>
                      <span>Processing</span>
                      <span>Out</span>
                      <span>Delivered</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: trackedOrder.status === 'Delivered' ? '100%' : 
                                 trackedOrder.status === 'Out for Delivery' ? '75%' : 
                                 trackedOrder.status === 'Baking' ? '50%' : 
                                 trackedOrder.status === 'Processing' ? '25%' : '5%'
                        }}
                        className="h-full bg-brand-secondary shadow-[0_0_15px_rgba(212,175,55,0.5)]" 
                       />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <Clock size={40} className="text-white/20 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Awaiting Tracking ID</h3>
                  <p className="text-white/40 text-sm max-w-xs">Once you enter your ID, your order journey will appear here.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-brand-primary text-white rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-secondary/20 rounded-full blur-3xl -ml-32 -mb-32" />
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">Subscribe for Sweet Deals</h2>
          <p className="text-white/70 mb-10 text-lg max-w-xl mx-auto relative z-10">Join our club and get 15% off your first order plus exclusive access to limited-time desserts.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto relative z-10">
            <input 
              type="email" 
              placeholder="Your email address" 
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-8 py-4 outline-none focus:bg-white/20 transition-all text-white placeholder:text-white/40"
            />
            <button className="bg-brand-secondary text-brand-primary font-bold px-8 py-4 rounded-full hover:scale-105 transition-all">
              Join Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-warm border-t border-brand-border pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <div className="text-2xl font-bold flex items-center gap-2 mb-6">
              {siteSettings.logo ? (
                <img src={siteSettings.logo} alt="AK SWEETS" className="h-10 w-auto" referrerPolicy="no-referrer" />
              ) : (
                <>
                  <Sparkles className="text-brand-accent" />
                  <span>AK SWEETS</span>
                </>
              )}
            </div>
            <p className="text-brand-primary/60 text-sm leading-relaxed mb-6 whitespace-pre-line">
              {siteSettings.footerDescription}
            </p>
            <div className="flex gap-4">
              <a 
                href={siteSettings.instagramUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center text-brand-accent hover:bg-brand-accent hover:text-white transition-all cursor-pointer"
              >
                <Instagram size={20} />
              </a>
              <a 
                href={siteSettings.facebookUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-brand-muted flex items-center justify-center text-brand-accent hover:bg-brand-accent hover:text-white transition-all cursor-pointer"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-sm text-brand-primary/70">
              <li><a href="#tracking" className="hover:text-brand-accent">Order Status</a></li>
              <li><a href="#" className="hover:text-brand-accent">Shipping Policy</a></li>
              <li><a href="#" className="hover:text-brand-accent">Bulk Orders</a></li>
              <li><a href="#" className="hover:text-brand-accent">Gift Cards</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">Contact Us</h4>
            <ul className="space-y-4 text-sm text-brand-primary/70">
              <li className="flex items-start gap-3">
                <MapPin className="text-brand-accent w-5 h-5 shrink-0" />
                <span className="whitespace-pre-line">{siteSettings.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="text-brand-accent w-5 h-5 shrink-0" />
                <span>{siteSettings.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="text-brand-accent w-5 h-5 shrink-0" />
                <span>{siteSettings.email}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-lg">Work Hours</h4>
            <ul className="space-y-3 text-sm text-brand-primary/70">
              <li className="flex justify-between">
                <span>Mon - Fri:</span>
                <span className="font-medium">{siteSettings.workingHoursMonFri}</span>
              </li>
              <li className="flex justify-between">
                <span>Saturday:</span>
                <span className="font-medium">{siteSettings.workingHoursSat}</span>
              </li>
              <li className="flex justify-between">
                <span>Sunday:</span>
                <span className="font-medium">{siteSettings.workingHoursSun}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-brand-border mt-16 pt-8 text-center text-xs text-brand-primary/40 uppercase tracking-widest">
          © {new Date().getFullYear()} AK Sweets Shop. All rights reserved.
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a 
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-[100] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        <MessageCircle size={32} fill="currentColor" />
        <span className="absolute -left-32 bg-white text-brand-primary px-4 py-2 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-brand-border pointer-events-none">
          Order Specials!
        </span>
      </a>
    </div>
  );
}
