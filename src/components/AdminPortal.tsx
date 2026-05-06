import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  LogIn, 
  LogOut, 
  User, 
  Shield, 
  Package,
  Image as ImageIcon,
  DollarSign,
  Star,
  CheckCircle2,
  PlayCircle,
  Video,
  Grid,
  Settings,
  MessageSquare,
  Quote,
  Truck,
  ClipboardList
} from 'lucide-react';
import { 
  db, 
  auth, 
  loginWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from '@/src/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  getDoc,
  setDoc
} from 'firebase/firestore';

interface Product {
  id?: string;
  name: string;
  price: string;
  desc: string;
  img: string;
  category?: string;
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
  createdAt?: string;
}

interface Category {
  id?: string;
  name: string;
  createdAt?: string;
}

export default function AdminPortal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [user, setUser] = useState(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'gallery' | 'settings' | 'testimonials' | 'orders' | 'categories'>('products');
  
  // Product state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Product>({ name: '', price: '', desc: '', img: '', category: '' });
  
  // Gallery state
  const [galleryUrl, setGalleryUrl] = useState('');
  const [galleryType, setGalleryType] = useState<'image' | 'video'>('image');

  // Testimonial state
  const [testimonialData, setTestimonialData] = useState<Testimonial>({ name: '', text: '', rating: 5, avatar: '' });

  // Category state
  const [categoryData, setCategoryData] = useState<Category>({ name: '' });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Order state
  const [orderData, setOrderData] = useState<Order>({ 
    orderId: '', 
    customerName: '', 
    status: 'Processing', 
    itemsSummary: '', 
    estimatedDelivery: '' 
  });
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  // Settings state
  const [siteSettings, setSiteSettings] = useState({
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
  
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const ADMIN_EMAIL = 'KALAM438@gmail.com'.toLowerCase();

  const checkAdminStatus = async (u: any) => {
    if (!u) {
      setIsAdmin(false);
      return;
    }
    
    // Check hardcoded email first
    if (u.email?.toLowerCase() === ADMIN_EMAIL && u.emailVerified) {
      setIsAdmin(true);
      return;
    }

    try {
      const adminDoc = await getDoc(doc(db, 'admins', u.uid));
      setIsAdmin(adminDoc.exists());
    } catch (e) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    return auth.onAuthStateChanged(async (u) => {
      setUser(u);
      checkAdminStatus(u);
    });
  }, []);

  const claimAdmin = async () => {
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) return;
    setIsBootstrapping(true);
    try {
      await setDoc(doc(db, 'admins', user.uid), {
        email: user.email,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      await checkAdminStatus(user);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'admins');
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const pList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(pList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const gList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
        setGallery(gList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'gallery');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribe = onSnapshot(doc(db, 'settings', 'main'), 
      (docSnap) => {
        if (docSnap.exists()) {
          setSiteSettings(docSnap.data() as any);
        }
      },
      (error) => {
        console.warn('Settings access restricted or missing.');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const tList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial));
        setTestimonials(tList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'testimonials');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const oList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(oList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const cList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(cList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'main'), siteSettings);
      alert('Site settings updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/main');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), { ...formData });
      } else {
        await addDoc(collection(db, 'products'), { ...formData });
      }
      setEditingId(null);
      setFormData({ name: '', price: '', desc: '', img: '', category: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryUrl) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'gallery'), { 
        url: galleryUrl, 
        type: galleryType, 
        createdAt: new Date().toISOString() 
      });
      setGalleryUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialData.name || !testimonialData.text) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'testimonials'), { 
        ...testimonialData, 
        createdAt: new Date().toISOString() 
      });
      setTestimonialData({ name: '', text: '', rating: 5, avatar: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'testimonials');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData.orderId) return;
    setLoading(true);
    try {
      const payload = {
        ...orderData,
        orderId: orderData.orderId.toUpperCase(),
        updatedAt: new Date().toISOString()
      };

      if (editingOrderId) {
        await updateDoc(doc(db, 'orders', editingOrderId), payload);
      } else {
        await addDoc(collection(db, 'orders'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      setOrderData({ orderId: '', customerName: '', status: 'Processing', itemsSummary: '', estimatedDelivery: '' });
      setEditingOrderId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryData.name) return;
    setLoading(true);
    try {
      if (editingCategoryId) {
        await updateDoc(doc(db, 'categories', editingCategoryId), { name: categoryData.name });
      } else {
        await addDoc(collection(db, 'categories'), { 
          name: categoryData.name,
          createdAt: new Date().toISOString() 
        });
      }
      setCategoryData({ name: '' });
      setEditingCategoryId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return;
    try {
      await deleteDoc(doc(db, 'gallery', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'gallery');
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    try {
      await deleteDoc(doc(db, 'testimonials', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'testimonials');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Delete this order tracking record?')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'orders');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? This will not delete products in this category.')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'categories');
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id!);
    setFormData({ name: p.name, price: p.price, desc: p.desc, img: p.img, category: p.category || '' });
  };

  const startEditOrder = (o: Order) => {
    setEditingOrderId(o.id!);
    setOrderData({
      orderId: o.orderId,
      customerName: o.customerName || '',
      status: o.status,
      itemsSummary: o.itemsSummary || '',
      estimatedDelivery: o.estimatedDelivery || ''
    });
  };

  const startEditCategory = (c: Category) => {
    setEditingCategoryId(c.id!);
    setCategoryData({ name: c.name });
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-brand-primary/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="bg-white w-full max-w-7xl h-[90vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 hover:bg-brand-muted rounded-full transition-colors z-20"
        >
          <X className="w-6 h-6 text-brand-primary" />
        </button>

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-brand-accent/10 rounded-3xl flex items-center justify-center text-brand-accent mb-8">
              <Shield className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Admin Access Only</h2>
            <p className="text-brand-primary/60 mb-10 max-w-md"> Please sign in with your authorized Google account to manage the shop inventory.</p>
            <button 
              onClick={loginWithGoogle}
              className="bg-brand-primary text-white px-10 py-4 rounded-full font-bold flex items-center gap-3 hover:bg-brand-accent transition-all shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
          </div>
        ) : !isAdmin ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mb-8">
              <Shield className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Admin Verification Required</h2>
            <p className="text-brand-primary/60 mb-10 max-w-md">Your account ({user.email}) is currently logged in but not yet active in the admin registry.</p>
            
            {user.email?.toLowerCase() === ADMIN_EMAIL ? (
              <div className="bg-brand-warm p-8 rounded-[2rem] border border-brand-accent/20 max-w-sm">
                <h4 className="font-bold mb-2">Hello, Master Admin</h4>
                <p className="text-xs text-brand-primary/60 mb-6">Click below to activate your administrative privileges for this workspace.</p>
                <button 
                  onClick={claimAdmin}
                  disabled={isBootstrapping}
                  className="w-full bg-brand-accent text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {isBootstrapping ? 'Activating...' : 'Claim Admin Status'}
                </button>
              </div>
            ) : (
              <button 
                onClick={logout}
                className="text-brand-accent font-bold flex items-center gap-2 hover:underline"
              >
                <LogOut className="w-5 h-5" />
                Sign in with Admin Account
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar / Editor */}
            <div className="w-full md:w-96 bg-brand-warm/30 border-r border-brand-border p-8 lg:p-12 overflow-y-auto">
              <div className="flex items-center gap-4 mb-10 pb-6 border-b border-brand-border">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-accent">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-brand-muted flex items-center justify-center text-brand-accent">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm truncate w-32">{user.displayName}</div>
                  <div className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">Administrator</div>
                </div>
              </div>

              <div className="flex bg-white/50 p-1 rounded-2xl mb-8 border border-brand-border">
                <button 
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-primary/40 hover:text-brand-primary'}`}
                >
                  <Package size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Store</span>
                </button>
                <button 
                  onClick={() => setActiveTab('gallery')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${activeTab === 'gallery' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-primary/40 hover:text-brand-primary'}`}
                >
                  <Grid size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Gallery</span>
                </button>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-primary/40 hover:text-brand-primary'}`}
                >
                  <ClipboardList size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
                </button>
                <button 
                  onClick={() => setActiveTab('categories')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${activeTab === 'categories' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-primary/40 hover:text-brand-primary'}`}
                >
                  <Grid size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Cats</span>
                </button>
                <button 
                  onClick={() => setActiveTab('testimonials')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${activeTab === 'testimonials' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-primary/40 hover:text-brand-primary'}`}
                >
                  <MessageSquare size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reviews</span>
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white shadow-sm text-brand-accent' : 'text-brand-primary/40 hover:text-brand-primary'}`}
                >
                  <Settings size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Config</span>
                </button>
              </div>

              {activeTab === 'products' ? (
                <form onSubmit={handleSaveProduct} className="space-y-6">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Edit Product' : 'Add New Sweets'}
                </h3>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Sweet Name</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Pistachio Baklava"
                      className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Price Tag</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
                    <input 
                      required
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      placeholder="e.g. $19.99/kg"
                      className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Product Image</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
                    <input 
                      required
                      value={formData.img}
                      onChange={e => setFormData({...formData, img: e.target.value})}
                      placeholder="Image URL..."
                      className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Category</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30 flex items-center justify-center">
                      <Star size={14} />
                    </div>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors appearance-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Description</label>
                  <textarea 
                    value={formData.desc}
                    onChange={e => setFormData({...formData, desc: e.target.value})}
                    placeholder="Short description..."
                    rows={3}
                    className="w-full bg-white border border-brand-border rounded-xl p-4 outline-none focus:border-brand-accent transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-2">
                   {editingId && (
                     <button 
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({ name: '', price: '', desc: '', img: '', category: '' });
                        }}
                        className="flex-1 px-4 py-3 rounded-xl border border-brand-border font-bold text-sm hover:bg-brand-muted transition-colors"
                     >
                       Cancel
                     </button>
                   )}
                   <button 
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-brand-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                   >
                     <Save className="w-4 h-4" />
                     {loading ? 'Saving...' : editingId ? 'Update' : 'Publish'}
                  </button>
                </div>
              </form>
              ) : activeTab === 'gallery' ? (
                <form onSubmit={handleSaveGallery} className="space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Gallery Item
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Media URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
                      <input 
                        required
                        value={galleryUrl}
                        onChange={e => setGalleryUrl(e.target.value)}
                        placeholder="Media URL..."
                        className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        onClick={() => setGalleryType('image')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${galleryType === 'image' ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white border-brand-border'}`}
                      >
                        <ImageIcon size={14} /> Image
                      </button>
                      <button 
                        type="button"
                        onClick={() => setGalleryType('video')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border font-bold text-xs transition-all ${galleryType === 'video' ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white border-brand-border'}`}
                      >
                        <Video size={14} /> Video
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Adding...' : 'Add to Gallery'}
                  </button>
                </form>
              ) : activeTab === 'orders' ? (
                <form onSubmit={handleSaveOrder} className="space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {editingOrderId ? <Edit2 size={18} /> : <Plus size={18} />}
                    {editingOrderId ? 'Update Order' : 'Create Tracking'}
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Order ID</label>
                    <input 
                      required
                      value={orderData.orderId}
                      onChange={e => setOrderData({...orderData, orderId: e.target.value})}
                      placeholder="e.g. AK-1234"
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                     <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Customer Name</label>
                     <input 
                       value={orderData.customerName}
                       onChange={e => setOrderData({...orderData, customerName: e.target.value})}
                       placeholder="e.g. John Doe"
                       className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                     />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Items Summary</label>
                    <input 
                      value={orderData.itemsSummary}
                      onChange={e => setOrderData({...orderData, itemsSummary: e.target.value})}
                      placeholder="e.g. 2x Baklava, 1x Turkish Tea"
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Est. Delivery</label>
                    <input 
                      value={orderData.estimatedDelivery}
                      onChange={e => setOrderData({...orderData, estimatedDelivery: e.target.value})}
                      placeholder="e.g. Oct 15 - Oct 17"
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Status</label>
                    <select 
                      value={orderData.status}
                      onChange={e => setOrderData({...orderData, status: e.target.value as any})}
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors appearance-none"
                    >
                      {["Processing", "Baking", "Out for Delivery", "Delivered", "Cancelled"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    {editingOrderId && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingOrderId(null);
                          setOrderData({ orderId: '', customerName: '', status: 'Processing', itemsSummary: '', estimatedDelivery: '' });
                        }}
                        className="flex-1 px-4 py-3 rounded-xl border border-brand-border font-bold text-sm hover:bg-brand-muted transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-brand-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : editingOrderId ? 'Update Order' : 'Create Order'}
                    </button>
                  </div>
                </form>
              ) : activeTab === 'categories' ? (
                <form onSubmit={handleSaveCategory} className="space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {editingCategoryId ? <Edit2 size={18} /> : <Plus size={18} />}
                    {editingCategoryId ? 'Edit Category' : 'Add Category'}
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Category Name</label>
                    <input 
                      required
                      value={categoryData.name}
                      onChange={e => setCategoryData({...categoryData, name: e.target.value})}
                      placeholder="e.g. Baklava"
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingCategoryId && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setCategoryData({ name: '' });
                        }}
                        className="flex-1 px-4 py-3 rounded-xl border border-brand-border font-bold text-sm hover:bg-brand-muted transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-[2] bg-brand-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : editingCategoryId ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              ) : activeTab === 'settings' ? (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Home Page Config
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Hero Headline</label>
                    <textarea 
                      value={siteSettings.heroTitle}
                      onChange={e => setSiteSettings({...siteSettings, heroTitle: e.target.value})}
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Hero Subtitle</label>
                    <textarea 
                      value={siteSettings.heroSubtitle}
                      onChange={e => setSiteSettings({...siteSettings, heroSubtitle: e.target.value})}
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Established Label</label>
                    <input 
                      value={siteSettings.established}
                      onChange={e => setSiteSettings({...siteSettings, established: e.target.value})}
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Site Logo URL (Optional)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
                      <input 
                        value={siteSettings.logo}
                        onChange={e => setSiteSettings({...siteSettings, logo: e.target.value})}
                        placeholder="Logo Image URL..."
                        className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Hero Background</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
                      <input 
                        value={siteSettings.heroImage}
                        onChange={e => setSiteSettings({...siteSettings, heroImage: e.target.value})}
                        placeholder="Image URL..."
                        className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">WhatsApp Number (e.g. 96891234567)</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary/30" />
                      <input 
                        value={siteSettings.whatsappNumber}
                        onChange={e => setSiteSettings({...siteSettings, whatsappNumber: e.target.value})}
                        placeholder="968..."
                        className="w-full bg-white border border-brand-border rounded-xl pl-11 pr-4 py-3 outline-none focus:border-brand-accent transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-brand-border">
                    <h4 className="font-bold mb-4">Our Story Section</h4>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Story Subtitle (e.g. Since 1985)</label>
                        <input 
                          value={siteSettings.storySubtitle}
                          onChange={e => setSiteSettings({...siteSettings, storySubtitle: e.target.value})}
                          placeholder="Since 1985"
                          className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Story Title</label>
                        <textarea 
                          value={siteSettings.storyTitle}
                          onChange={e => setSiteSettings({...siteSettings, storyTitle: e.target.value})}
                          placeholder="Story title..."
                          rows={2}
                          className="w-full bg-white border border-brand-border rounded-xl p-4 outline-none focus:border-brand-accent transition-colors resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Story Image URL</label>
                        <input 
                          value={siteSettings.storyImage}
                          onChange={e => setSiteSettings({...siteSettings, storyImage: e.target.value})}
                          placeholder="Image URL..."
                          className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Story Description</label>
                        <textarea 
                          value={siteSettings.storyDescription}
                          onChange={e => setSiteSettings({...siteSettings, storyDescription: e.target.value})}
                          placeholder="Full story description..."
                          rows={4}
                          className="w-full bg-white border border-brand-border rounded-xl p-4 outline-none focus:border-brand-accent transition-colors resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Highlight Point 1</label>
                        <input 
                          value={siteSettings.storyPoint1}
                          onChange={e => setSiteSettings({...siteSettings, storyPoint1: e.target.value})}
                          placeholder="Point 1..."
                          className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Highlight Point 2</label>
                        <input 
                          value={siteSettings.storyPoint2}
                          onChange={e => setSiteSettings({...siteSettings, storyPoint2: e.target.value})}
                          placeholder="Point 2..."
                          className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-brand-border">
                    <h4 className="font-bold mb-4">Footer Section</h4>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Footer Description</label>
                        <textarea 
                          value={siteSettings.footerDescription}
                          onChange={e => setSiteSettings({...siteSettings, footerDescription: e.target.value})}
                          placeholder="Footer description..."
                          rows={3}
                          className="w-full bg-white border border-brand-border rounded-xl p-4 outline-none focus:border-brand-accent transition-colors resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Instagram URL</label>
                          <input 
                            value={siteSettings.instagramUrl}
                            onChange={e => setSiteSettings({...siteSettings, instagramUrl: e.target.value})}
                            placeholder="#"
                            className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Facebook URL</label>
                          <input 
                            value={siteSettings.facebookUrl}
                            onChange={e => setSiteSettings({...siteSettings, facebookUrl: e.target.value})}
                            placeholder="#"
                            className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Address</label>
                        <textarea 
                          value={siteSettings.address}
                          onChange={e => setSiteSettings({...siteSettings, address: e.target.value})}
                          placeholder="Shop address..."
                          rows={2}
                          className="w-full bg-white border border-brand-border rounded-xl p-4 outline-none focus:border-brand-accent transition-colors resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Phone</label>
                          <input 
                            value={siteSettings.phone}
                            onChange={e => setSiteSettings({...siteSettings, phone: e.target.value})}
                            placeholder="Phone number..."
                            className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Email</label>
                          <input 
                            value={siteSettings.email}
                            onChange={e => setSiteSettings({...siteSettings, email: e.target.value})}
                            placeholder="Email address..."
                            className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Work Hours (Mon - Fri)</label>
                        <input 
                          value={siteSettings.workingHoursMonFri}
                          onChange={e => setSiteSettings({...siteSettings, workingHoursMonFri: e.target.value})}
                          placeholder="e.g. 8:00 AM - 9:00 PM"
                          className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Work Hours (Saturday)</label>
                        <input 
                          value={siteSettings.workingHoursSat}
                          onChange={e => setSiteSettings({...siteSettings, workingHoursSat: e.target.value})}
                          placeholder="e.g. 9:00 AM - 10:00 PM"
                          className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Work Hours (Sunday)</label>
                        <input 
                          value={siteSettings.workingHoursSun}
                          onChange={e => setSiteSettings({...siteSettings, workingHoursSun: e.target.value})}
                          placeholder="e.g. 10:00 AM - 8:00 PM"
                          className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-accent text-white px-4 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Updating...' : 'Save Site Settings'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSaveTestimonial} className="space-y-6">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Add Customer Review
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Customer Name</label>
                    <input 
                      required
                      value={testimonialData.name}
                      onChange={e => setTestimonialData({...testimonialData, name: e.target.value})}
                      placeholder="e.g. Sarah J."
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Review Text</label>
                    <textarea 
                      required
                      value={testimonialData.text}
                      onChange={e => setTestimonialData({...testimonialData, text: e.target.value})}
                      placeholder="What did they say?"
                      rows={4}
                      className="w-full bg-white border border-brand-border rounded-xl p-4 outline-none focus:border-brand-accent transition-colors resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Rating</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(num => (
                        <button 
                          key={num}
                          type="button"
                          onClick={() => setTestimonialData({...testimonialData, rating: num})}
                          className={`flex-1 py-3 rounded-xl border font-bold transition-all ${testimonialData.rating >= num ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white border-brand-border text-brand-primary/40'}`}
                        >
                          <Star size={14} className="mx-auto" fill={testimonialData.rating >= num ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand-primary/40 tracking-widest px-2">Avatar URL (Optional)</label>
                    <input 
                      value={testimonialData.avatar}
                      onChange={e => setTestimonialData({...testimonialData, avatar: e.target.value})}
                      placeholder="https://..."
                      className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 outline-none focus:border-brand-accent transition-colors"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Posting...' : 'Post Review'}
                  </button>
                </form>
              )}
              
              <button 
                onClick={logout}
                className="mt-12 w-full flex items-center justify-center gap-2 text-red-500 font-bold text-xs p-4 border border-red-100 rounded-2xl hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Admin Session
              </button>
            </div>

            {/* Main Content / List */}
            <div className="flex-1 p-12 lg:p-16 overflow-y-auto">
               {activeTab === 'products' ? (
                 <>
                   <h3 className="text-2xl font-bold mb-8">Active Inventory ({products.length})</h3>
                   <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {products.map(p => (
                       <div key={p.id} className="bg-brand-muted/20 border border-brand-border p-4 rounded-3xl flex gap-4 group">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0">
                            {p.img ? (
                              <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-brand-muted flex items-center justify-center">
                                <Package className="w-8 h-8 text-brand-primary/10" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                  <h4 className="font-bold truncate" title={p.name}>{p.name}</h4>
                                  <span className="text-[10px] text-brand-accent font-bold uppercase tracking-widest">{p.category || 'No Category'}</span>
                                </div>
                                <span className="text-brand-accent font-bold text-sm">{p.price}</span>
                             </div>
                             <p className="text-xs text-brand-primary/50 line-clamp-1 mb-4">{p.desc}</p>
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => startEdit(p)}
                                  className="p-2 bg-white border border-brand-border rounded-lg text-brand-primary hover:text-brand-accent transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.id!)}
                                  className="p-2 bg-white border border-brand-border rounded-lg text-brand-primary hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                 </>
               ) : activeTab === 'gallery' ? (
                 <>
                   <h3 className="text-2xl font-bold mb-8">Gallery Hub ({gallery.length})</h3>
                   <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                     {gallery.map(item => (
                       <div key={item.id} className="relative group aspect-square rounded-[2rem] overflow-hidden border border-brand-border shadow-sm">
                          {item.type === 'video' ? (
                            <div className="w-full h-full bg-black flex items-center justify-center relative cursor-pointer" onClick={(e) => {
                               const v = e.currentTarget.querySelector('video');
                               if (v) {
                                 if (v.paused) v.play();
                                 else v.pause();
                               }
                            }}>
                               <video 
                                 src={item.url || 'null'} 
                                 className="w-full h-full object-cover opacity-60" 
                                 muted 
                                 autoPlay 
                                 loop 
                                 playsInline 
                               />
                               <PlayCircle className="absolute inset-0 m-auto text-white w-12 h-12 drop-shadow-lg" />
                            </div>
                          ) : (
                            <><img src={item.url || 'null'} className="w-full h-full object-cover" />
                             {!item.url && (
                               <div className="absolute inset-0 bg-brand-muted flex items-center justify-center">
                                 <ImageIcon className="w-12 h-12 text-brand-primary/10" />
                               </div>
                             )}
                           </>
                         )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button 
                               onClick={() => handleDeleteGallery(item.id!)}
                               className="bg-white text-red-500 p-3 rounded-full hover:scale-110 transition-transform shadow-lg"
                               title="Delete Item"
                             >
                                <Trash2 size={20} />
                             </button>
                          </div>
                          {item.type === 'video' && (
                            <div className="absolute top-4 right-4 bg-brand-accent text-white p-1 rounded-md">
                               <Video size={12} />
                            </div>
                          )}
                       </div>
                     ))}
                   </div>
                 </>
               ) : activeTab === 'orders' ? (
                  <>
                    <h3 className="text-2xl font-bold mb-8">Active Orders ({orders.length})</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {orders.map(o => (
                        <div key={o.id} className="bg-brand-muted/20 border border-brand-border p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex gap-4 items-center">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${o.status === 'Delivered' ? 'bg-green-100 text-green-600' : 'bg-brand-accent/10 text-brand-accent'}`}>
                              <Truck size={24} />
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                 <span className="font-mono font-bold">{o.orderId}</span>
                                 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                                   o.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                   o.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-brand-accent/20 text-brand-accent'
                                 }`}>
                                   {o.status}
                                 </span>
                               </div>
                               <div className="text-sm text-brand-primary/60">{o.customerName || 'Anonymous Customer'}</div>
                            </div>
                          </div>
                          
                          <div className="flex-1 px-4 text-xs text-brand-primary/40 hidden lg:block">
                            <div className="truncate">{o.itemsSummary}</div>
                            <div>Est: {o.estimatedDelivery || 'N/A'}</div>
                          </div>

                          <div className="flex gap-2">
                             <button 
                               onClick={() => startEditOrder(o)}
                               className="p-3 bg-white border border-brand-border rounded-xl text-brand-primary hover:text-brand-accent transition-colors"
                             >
                               <Edit2 size={16} />
                             </button>
                             <button 
                               onClick={() => handleDeleteOrder(o.id!)}
                               className="p-3 bg-white border border-brand-border rounded-xl text-brand-primary hover:text-red-500 transition-colors"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
               ) : activeTab === 'categories' ? (
                  <>
                    <h3 className="text-2xl font-bold mb-8">Product Categories ({categories.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map(c => (
                        <div key={c.id} className="bg-brand-muted/20 border border-brand-border p-6 rounded-3xl flex justify-between items-center group">
                          <div>
                            <div className="font-bold text-lg">{c.name}</div>
                            <div className="text-[10px] text-brand-primary/40 uppercase font-bold tracking-widest">
                              {products.filter(p => p.category === c.name).length} Products
                            </div>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => startEditCategory(c)}
                               className="p-3 bg-white border border-brand-border rounded-xl text-brand-primary hover:text-brand-accent transition-colors"
                             >
                               <Edit2 size={16} />
                             </button>
                             <button 
                               onClick={() => handleDeleteCategory(c.id!)}
                               className="p-3 bg-white border border-brand-border rounded-xl text-brand-primary hover:text-red-500 transition-colors"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : activeTab === 'testimonials' ? (
                 <>
                   <h3 className="text-2xl font-bold mb-8">Customer Reviews ({testimonials.length})</h3>
                   <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {testimonials.map(t => (
                       <div key={t.id} className="bg-white border border-brand-border p-8 rounded-[2rem] shadow-sm relative group">
                         <button 
                           onClick={() => handleDeleteTestimonial(t.id!)}
                           className="absolute top-6 right-6 p-2 text-brand-primary/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                         >
                           <Trash2 size={16} />
                         </button>
                         
                         <div className="flex gap-1 text-brand-accent mb-4">
                           {[...Array(5)].map((_, i) => (
                             <Star key={i} size={14} fill={i < t.rating ? 'currentColor' : 'none'} className={i < t.rating ? '' : 'text-brand-primary/10'} />
                           ))}
                         </div>
                         
                         <p className="text-sm text-brand-primary/70 italic mb-8 relative">
                           <Quote className="absolute -left-4 -top-2 w-8 h-8 text-brand-accent/5 -z-10" />
                           "{t.text}"
                         </p>
                         
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full overflow-hidden bg-brand-muted">
                             {t.avatar ? <img src={t.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-brand-primary/20"><User size={20} /></div>}
                           </div>
                           <div className="font-bold text-sm">{t.name}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </>
               ) : (
                 <div className="py-20 text-center text-brand-primary/40 italic">Site settings are managed in the config panel on the left.</div>
               )}
               
               {activeTab === 'products' && products.length === 0 && (
                 <div className="py-20 text-center opacity-40 italic">No products found.</div>
               )}
               {activeTab === 'gallery' && gallery.length === 0 && (
                 <div className="py-20 text-center opacity-40 italic">Gallery is empty. Add some sweet moments!</div>
               )}
               {activeTab === 'testimonials' && testimonials.length === 0 && (
                 <div className="py-20 text-center opacity-40 italic">No reviews yet. Be the first to add one!</div>
               )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
