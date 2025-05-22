"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, Coins, Leaf, Search, Bell, User, ChevronDown, LogIn, LogOut, X } from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { toast } from "react-hot-toast"
import { Input } from "@/components/ui/input"

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [balance, setBalance] = useState(0)
  const [loginOpen, setLoginOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const init = async () => {
      try {
        // Check if user is logged in from localStorage
        const storedEmail = localStorage.getItem('userEmail');
        const storedName = localStorage.getItem('userName');
        
        if (storedEmail) {
          setLoggedIn(true);
          setUserInfo({
            email: storedEmail,
            name: storedName || 'Anonymous User'
          });
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    // Handle clicking outside of modal to close it
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setLoginOpen(false);
      }
    }

    // Add event listener when modal is open
    if (loginOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [loginOpen]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userInfo && userInfo.email) {
        try {
          // Mock notifications functionality to avoid database errors
          // In a real app, you would want to implement proper error handling when connecting to your DB
          const mockNotifications = []; // Empty array to simulate no notifications
          setNotifications(mockNotifications);
          
          // Uncomment and adapt the code below when your database connection is fixed
          /*
          const user = await getUserByEmail(userInfo.email);
          if (user) {
            const unreadNotifications = await getUnreadNotifications(user.id);
            setNotifications(unreadNotifications);
          }
          */
        } catch (error) {
          console.error('Error fetching notifications:', error);
          // Silent fail - don't break the UI for notification issues
          setNotifications([]);
        }
      }
    };

    fetchNotifications();

    // Set up periodic checking for new notifications
    const notificationInterval = setInterval(fetchNotifications, 30000); // Check every 30 seconds

    return () => clearInterval(notificationInterval);
  }, [userInfo]);

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (userInfo && userInfo.email) {
        try {
          // Mock balance functionality to avoid database errors
          // In a real app, implement proper error handling for database connections
          setBalance(totalEarnings || 0);
          
          // Uncomment and adapt the code below when your database connection is fixed
          /*
          const user = await getUserByEmail(userInfo.email);
          if (user) {
            const userBalance = await getUserBalance(user.id);
            setBalance(userBalance);
          }
          */
        } catch (error) {
          console.error('Error fetching user balance:', error);
          // Use the totalEarnings prop as a fallback
          setBalance(totalEarnings || 0);
        }
      }
    };

    fetchUserBalance();

    // Add an event listener for balance updates
    const handleBalanceUpdate = (event: CustomEvent) => {
      setBalance(event.detail);
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);

    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    };
  }, [userInfo, totalEarnings]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (isRegistering) {
      // Registration logic
      if (!email || !name || !password) {
        toast.error("Please fill all fields");
        return;
      }
      
      try {
        // Here you would normally send request to your backend
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', name);
        
        setLoggedIn(true);
        setUserInfo({
          email: email,
          name: name
        });
        
        toast.success("Registration successful!");
        setLoginOpen(false);
        resetForm();
      } catch (error) {
        console.error("Error during registration:", error);
        toast.error("Registration failed. Please try again.");
      }
    } else {
      // Login logic
      if (!email || !password) {
        toast.error("Please enter email and password");
        return;
      }
      
      try {
        // Here you would normally verify with your backend
        // For now, we'll just store in localStorage
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', name || 'User');
        
        setLoggedIn(true);
        setUserInfo({
          email: email,
          name: name || 'User'
        });
        
        toast.success("Login successful!");
        setLoginOpen(false);
        resetForm();
      } catch (error) {
        console.error("Error during login:", error);
        toast.error("Login failed. Please try again.");
      }
    }
  };

  const resetForm = () => {
    setEmail("");
    setName("");
    setPassword("");
    setIsRegistering(false);
  };

  const logout = async () => {
    try {
      // Clear user data from localStorage
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      
      // Reset state
      setLoggedIn(false);
      setUserInfo(null);
      setNotifications([]);
      setBalance(0);
      
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  const getUserInfo = () => {
    // This function now just displays what we already have, since we're not querying the DB
    if (userInfo && userInfo.name) {
      toast.success(`Hello, ${userInfo.name}!`);
    }
  };

  const handleNotificationClick = async (notificationId: number) => {
    try {
      // Mock marking notification as read
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      
      // Uncomment when database is fixed
      /*
      await markNotificationAsRead(notificationId);
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      */
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2 md:mr-4" onClick={onMenuClick}>
              <Menu className="h-6 w-6" />
            </Button>
            <Link href="/" className="flex items-center">
              <Leaf className="h-6 w-6 md:h-8 md:w-8 text-green-500 mr-1 md:mr-2" />
              <div className="flex flex-col">
                <span className="font-bold text-base md:text-lg text-gray-800">WasteWise</span>
                <span className="text-[8px] md:text-[10px] text-gray-500 -mt-1">Platform</span>
              </div>
            </Link>
          </div>
          {!isMobile && (
            <div className="flex-1 max-w-xl mx-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}
          <div className="flex items-center">
            {isMobile && (
              <Button variant="ghost" size="icon" className="mr-2">
                <Search className="h-5 w-5" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2 relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem 
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{notification.type}</span>
                        <span className="text-sm text-gray-500">{notification.message}</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem>No new notifications</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="mr-2 md:mr-4 flex items-center bg-gray-100 rounded-full px-2 md:px-3 py-1">
              <Coins className="h-4 w-4 md:h-5 md:w-5 mr-1 text-green-500" />
              <span className="font-semibold text-sm md:text-base text-gray-800">
                {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
              </span>
            </div>
            {!loggedIn ? (
              <Button 
                onClick={() => setLoginOpen(true)} 
                className="bg-green-600 hover:bg-green-700 text-white text-sm md:text-base"
              >
                Login
                <LogIn className="ml-1 md:ml-2 h-4 w-4 md:h-5 md:w-5" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="flex items-center">
                    <User className="h-5 w-5 mr-1" />
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={getUserInfo}>
                    {userInfo ? userInfo.name : "User Profile"}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/settings">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Custom Modal */}
      {loginOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center">
                <Leaf className="h-5 w-5 text-green-500 mr-2" />
                <h2 className="text-xl font-semibold text-gray-800">
                  {isRegistering ? "Create an Account" : "Welcome Back"}
                </h2>
              </div>
              <button 
                onClick={() => setLoginOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4">
              <p className="text-gray-600 mb-4">
                {isRegistering 
                  ? "Join the WasteWise community to track and earn rewards for your recycling."
                  : "Sign in to your WasteWise account to continue your sustainable journey."}
              </p>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                {isRegistering && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="John Doe" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                {!isRegistering && (
                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      className="text-sm text-green-600 hover:text-green-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {isRegistering ? "Create Account" : "Login"}
                  </Button>
                </div>
              </form>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-gray-50 px-4 py-3 text-center">
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-800 underline"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}