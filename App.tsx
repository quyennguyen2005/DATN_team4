import React, { useState, useEffect, useRef } from 'react';
import { User, Message, keyPairIdentity } from './types';
import * as CryptoService from './services/cryptoService';
import { getGeminiReply } from './services/geminiService';
import { AuthScreen } from './components/AuthScreen';
import {
  MenuIcon, SearchIcon, SendIcon, CheckIcon, BackArrowIcon,
  AttachmentIcon, LockIcon, MicIcon, RobotIcon, PlusIcon, CloseIcon, UserPlusIcon,
  ChatBubbleIcon, UsersGroupIcon, BellIcon, SettingsIcon
} from './components/Icons';

const GEMINI_BOT_ID = 'gemini-bot';
const GEMINI_USER: User = { id: GEMINI_BOT_ID, name: 'Gemini Assistant', avatar: '' };

// "Server" Database of all possible users
const MOCK_USER_DATABASE: User[] = [
  GEMINI_USER,
  { id: 'u1', name: 'Alice Smith', avatar: 'https://picsum.photos/id/1011/100/100' },
  { id: 'u2', name: 'Bob Johnson', avatar: 'https://picsum.photos/id/1005/100/100' },
  { id: 'u3', name: 'Charlie Davis', avatar: 'https://picsum.photos/id/1027/100/100' },
  { id: 'u4', name: 'David Wilson', avatar: 'https://picsum.photos/id/1015/100/100' },
  { id: 'u5', name: 'Eva Green', avatar: 'https://picsum.photos/id/1025/100/100' },
  { id: 'u6', name: 'Frank Miller', avatar: 'https://picsum.photos/id/1060/100/100' },
  { id: 'u7', name: 'Grace Lee', avatar: 'https://picsum.photos/id/1074/100/100' },
  { id: 'u8', name: 'Henry Ford', avatar: 'https://picsum.photos/id/1084/100/100' },
];

const App = () => {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends' | 'notifications' | 'menu'>('chats');
  
  // Contacts State
  const [contacts, setContacts] = useState<User[]>([GEMINI_USER]); // Start with only the Bot
  const [activeContact, setActiveContact] = useState<User | null>(null);
  
  // Messaging & Keys
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputText, setInputText] = useState('');
  const [keyPair, setKeyPair] = useState<keyPairIdentity | null>(null);
  const [contactSharedKeys, setContactSharedKeys] = useState<Record<string, CryptoKey>>({});
  
  // Search / Add Friend State
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<User[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!currentUser) return; // Only init keys after login

    const initKeys = async () => {
      // 1. Generate my key pair if not exists
      if (!keyPair) {
        const myKeys = await CryptoService.generateKeyPair();
        setKeyPair({
            publicKey: myKeys.publicKey,
            privateKey: myKeys.privateKey
        });
      }
    };
    initKeys();
  }, [currentUser]);

  // Effect to handle search filtering (Friends Tab)
  useEffect(() => {
    if (activeTab === 'friends' && friendsSearchQuery.trim().length > 0) {
      const query = friendsSearchQuery.toLowerCase();
      // Filter users from DB who are NOT me, and NOT already in my contacts
      const results = MOCK_USER_DATABASE.filter(user => 
        user.id !== currentUser?.id &&
        !contacts.find(c => c.id === user.id) &&
        (user.name.toLowerCase().includes(query) || user.id.includes(query))
      );
      setFoundUsers(results);
    } else {
      setFoundUsers([]);
    }
  }, [friendsSearchQuery, activeTab, contacts, currentUser]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeContact) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeContact]);

  // --- HANDLERS ---
  
  const handleLogin = (userData: { name: string; id: string }) => {
    setCurrentUser({
      id: userData.id,
      name: userData.name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random&color=fff`
    });
  };

  const handleContactSelect = (contact: User) => {
    setActiveContact(contact);
  };

  const handleAddContact = async (userToAdd: User) => {
    if (!keyPair) return;

    // 1. Add to local contacts list
    setContacts(prev => [userToAdd, ...prev]);

    // 2. Generate Shared Secret (Simulate Key Exchange)
    const contactDummyKeys = await CryptoService.generateKeyPair();
    const shared = await CryptoService.deriveSharedKey(
        keyPair.privateKey, 
        contactDummyKeys.publicKey
    );

    setContactSharedKeys(prev => ({
        ...prev,
        [userToAdd.id]: shared
    }));

    // 3. Clear search and select
    setFriendsSearchQuery('');
    setActiveTab('chats'); // Switch back to chats to talk
    setActiveContact(userToAdd);
  };

  const handleBack = () => {
    setActiveContact(null);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeContact || !currentUser) return;

    const textToSend = inputText;
    setInputText(''); // Clear immediately for UX

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      receiverId: activeContact.id,
      text: textToSend,
      timestamp: Date.now(),
      status: 'sent',
      isEncrypted: activeContact.id !== GEMINI_BOT_ID
    };

    // If E2EE, we encrypt the payload for "transport"
    if (activeContact.id !== GEMINI_BOT_ID && contactSharedKeys[activeContact.id]) {
        const sharedKey = contactSharedKeys[activeContact.id];
        const { iv, ciphertext } = await CryptoService.encryptMessage(sharedKey, textToSend);
        
        // Serialize to simulate wire format
        const iv64 = CryptoService.bufferToBase64(iv);
        const cipher64 = CryptoService.bufferToBase64(ciphertext);
        newMessage.encryptedData = JSON.stringify({ iv: iv64, data: cipher64 });
    }

    // Update Local State
    setMessages(prev => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMessage]
    }));

    // Handle Reply Simulation
    if (activeContact.id === GEMINI_BOT_ID) {
      // AI Reply
      try {
        const replyText = await getGeminiReply(textToSend);
        const replyMessage: Message = {
          id: (Date.now() + 1).toString(),
          senderId: GEMINI_BOT_ID,
          receiverId: currentUser.id,
          text: replyText,
          timestamp: Date.now(),
          status: 'read',
          isEncrypted: false
        };
        setMessages(prev => ({
            ...prev,
            [activeContact.id]: [...(prev[activeContact.id] || []), replyMessage]
          }));
      } catch (err) {
        console.error(err);
      }
    } else {
      // Mock User Reply (Simulating Network/Decryption delay)
      setTimeout(async () => {
        const mockReplies = ["Okay, sounds good!", "Did you see that?", "I'm busy right now.", "Can we talk later?", "LOL", "Checking encryption keys..."];
        const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
        
        let encryptedDataStr: string | undefined = undefined;
        
        // Encrypt the dummy reply
        if (contactSharedKeys[activeContact.id]) {
            const sharedKey = contactSharedKeys[activeContact.id];
            const { iv, ciphertext } = await CryptoService.encryptMessage(sharedKey, randomReply);
             const iv64 = CryptoService.bufferToBase64(iv);
            const cipher64 = CryptoService.bufferToBase64(ciphertext);
            encryptedDataStr = JSON.stringify({ iv: iv64, data: cipher64 });
        }

        const replyMessage: Message = {
          id: (Date.now() + 100).toString(),
          senderId: activeContact.id,
          receiverId: currentUser.id,
          text: randomReply,
          encryptedData: encryptedDataStr,
          timestamp: Date.now(),
          status: 'read',
          isEncrypted: true
        };

        setMessages(prev => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), replyMessage]
        }));
      }, 1500);
    }
  };

  // --- RENDER HELPERS ---

  const renderSidebarContent = () => {
      switch (activeTab) {
          case 'chats':
              return (
                  <div className="flex-1 overflow-y-auto">
                    {contacts.length === 0 ? (
                         <div className="text-center text-gray-400 py-10 px-4">
                            <p>No chats yet.</p>
                            <button onClick={() => setActiveTab('friends')} className="text-[#517da2] mt-2 underline">Find friends</button>
                         </div>
                    ) : (
                        contacts.map(contact => {
                            const chatMessages = messages[contact.id] || [];
                            const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
                            const isActive = activeContact?.id === contact.id;
                            return (
                                <div 
                                    key={contact.id} 
                                    onClick={() => handleContactSelect(contact)}
                                    className={`flex items-center p-3 cursor-pointer transition border-b border-gray-50 ${isActive ? 'bg-blue-50 md:bg-[#517da2]/10' : 'hover:bg-gray-100'}`}
                                >
                                    {contact.id === GEMINI_BOT_ID ? (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white mr-3 shrink-0 shadow-sm">
                                            <RobotIcon />
                                        </div>
                                    ) : (
                                        <img src={contact.avatar} alt={contact.name} className="w-14 h-14 rounded-full mr-3 object-cover shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <h3 className={`font-semibold truncate ${isActive ? 'text-[#517da2]' : 'text-gray-900'}`}>{contact.name}</h3>
                                            {lastMsg && (
                                                <span className="text-xs text-gray-400 shrink-0 ml-2">
                                                    {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <p className="text-gray-500 text-sm truncate flex items-center">
                                                {lastMsg ? (
                                                    <>{lastMsg.senderId === currentUser?.id && <span className="mr-1">You:</span>}{lastMsg.text}</>
                                                ) : (
                                                    <span className="text-blue-500 italic">Tap to chat</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                  </div>
              );
          case 'friends':
              return (
                  <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
                      {/* Search Bar Area */}
                      <div className="p-3 bg-white border-b border-gray-200 sticky top-0 z-10 shrink-0">
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                  <SearchIcon />
                              </div>
                              <input 
                                  type="text"
                                  value={friendsSearchQuery}
                                  onChange={(e) => setFriendsSearchQuery(e.target.value)}
                                  placeholder="Search name or email..."
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#517da2] bg-gray-50"
                              />
                          </div>
                      </div>
                      
                      {/* Results List */}
                      <div className="flex-1 overflow-y-auto p-2">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">
                              {friendsSearchQuery ? 'Search Results' : 'Suggested Users'}
                          </h3>
                          
                          {friendsSearchQuery.length > 0 && foundUsers.length === 0 ? (
                               <div className="text-center text-gray-400 py-8 text-sm">No users found.</div>
                          ) : (
                              (friendsSearchQuery.length > 0 ? foundUsers : MOCK_USER_DATABASE.filter(u => u.id !== currentUser?.id && !contacts.find(c => c.id === u.id))).map(user => (
                                  <div key={user.id} className="flex items-center justify-between p-3 bg-white mb-2 rounded-lg shadow-sm border border-gray-100">
                                       <div className="flex items-center">
                                           <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full mr-3 object-cover" />
                                           <span className="font-semibold text-gray-800">{user.name}</span>
                                       </div>
                                       <button 
                                          onClick={() => handleAddContact(user)}
                                          className="text-[#517da2] bg-blue-50 p-2 rounded-full hover:bg-[#517da2] hover:text-white transition shadow-sm"
                                       >
                                           <UserPlusIcon />
                                       </button>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              );
          case 'notifications':
              return (
                  <div className="flex-1 overflow-y-auto p-4">
                      <h2 className="text-lg font-bold text-gray-800 mb-4">Notifications</h2>
                      <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                              <p className="font-semibold text-[#517da2]">Welcome!</p>
                              <p className="text-gray-600">You have successfully logged in to TeleReact.</p>
                              <span className="text-xs text-gray-400 mt-1 block">Just now</span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-gray-100 text-sm shadow-sm opacity-60">
                              <p className="font-semibold text-gray-800">System Update</p>
                              <p className="text-gray-600">E2EE keys generated successfully.</p>
                              <span className="text-xs text-gray-400 mt-1 block">2 mins ago</span>
                          </div>
                      </div>
                  </div>
              );
          case 'menu':
              return (
                  <div className="flex-1 overflow-y-auto bg-gray-50">
                      <div className="bg-white p-6 flex flex-col items-center border-b border-gray-200">
                          <img src={currentUser?.avatar} alt="Profile" className="w-24 h-24 rounded-full mb-3 border-4 border-gray-100" />
                          <h2 className="text-xl font-bold text-gray-800">{currentUser?.name}</h2>
                          <p className="text-sm text-gray-500">ID: {currentUser?.id}</p>
                      </div>
                      <div className="p-4 space-y-2">
                          <div className="bg-white p-3 rounded-lg shadow-sm flex items-center text-gray-700 cursor-pointer hover:bg-gray-50">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3"><LockIcon /></div>
                              Privacy & Security
                          </div>
                           <div className="bg-white p-3 rounded-lg shadow-sm flex items-center text-gray-700 cursor-pointer hover:bg-gray-50">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center mr-3"><BellIcon /></div>
                              Notifications
                          </div>
                          <div className="mt-6">
                             <button onClick={() => setCurrentUser(null)} className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition">
                                 Log Out
                             </button>
                          </div>
                          <div className="mt-8 text-center">
                              <p className="text-xs text-gray-400">TeleReact v1.1.0</p>
                          </div>
                      </div>
                  </div>
              );
          default:
              return null;
      }
  }

  // --- RENDER ---
  
  if (!currentUser) {
      return (
          <div className="w-full h-full md:h-[90vh] md:w-[95vw] md:max-w-[1200px] bg-white shadow-2xl relative overflow-hidden md:rounded-xl md:my-auto">
              <AuthScreen onLogin={handleLogin} />
          </div>
      )
  }

  return (
    <div className="w-full h-full md:h-[90vh] md:w-[95vw] md:max-w-[1600px] bg-white shadow-2xl relative overflow-hidden md:rounded-xl md:my-auto flex font-sans">
      
      {/* 
        --- LEFT SIDEBAR (CONTACT LIST & NAV) --- 
        Visible on Mobile if no chat selected.
        Always visible on Desktop.
      */}
      <div className={`
        flex-col border-r border-gray-200 bg-white h-full z-20 w-full md:w-[360px] lg:w-[400px] shrink-0
        ${activeContact ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Sidebar Header - Simplified */}
        <div className="bg-[#517da2] text-white p-3 px-4 flex items-center shadow-md shrink-0 h-[60px] justify-between z-10">
             <h1 className="text-xl font-bold">TeleReact</h1>
             {currentUser && (
                 <img src={currentUser.avatar} alt="Me" className="w-8 h-8 rounded-full border border-white/30" />
             )}
        </div>

        {/* Content Area (Switchable) */}
        {renderSidebarContent()}

        {/* Bottom Navigation Bar */}
        <div className="h-16 bg-white border-t border-gray-200 flex justify-around items-center shrink-0 z-10 px-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button 
                onClick={() => setActiveTab('chats')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'chats' ? 'text-[#517da2]' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <ChatBubbleIcon />
                <span className="text-[10px] font-medium">Chats</span>
            </button>
            <button 
                onClick={() => setActiveTab('friends')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'friends' ? 'text-[#517da2]' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <UsersGroupIcon />
                <span className="text-[10px] font-medium">Friends</span>
            </button>
             <button 
                onClick={() => setActiveTab('notifications')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'notifications' ? 'text-[#517da2]' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <BellIcon />
                <span className="text-[10px] font-medium">Alerts</span>
            </button>
             <button 
                onClick={() => setActiveTab('menu')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'menu' ? 'text-[#517da2]' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <SettingsIcon />
                <span className="text-[10px] font-medium">Menu</span>
            </button>
        </div>
      </div>

      {/* 
        --- RIGHT MAIN AREA (CHAT) ---
        Visible on Mobile if chat selected.
        Always visible on Desktop.
      */}
      <div className={`
        flex-col flex-1 h-full relative bg-[#e3e5e8]
        ${!activeContact ? 'hidden md:flex' : 'flex'}
      `}>
         {/* Chat Background Pattern */}
         <div className="absolute inset-0 opacity-5 pointer-events-none z-0" 
              style={{
                  backgroundImage: `radial-gradient(#517da2 1px, transparent 1px)`,
                  backgroundSize: '20px 20px'
              }}
         ></div>

        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-2 px-4 flex items-center shadow-sm z-10 h-[60px] shrink-0">
               <button onClick={handleBack} className="md:hidden mr-2 text-gray-600 hover:bg-gray-100 rounded-full p-2 transition">
                 <BackArrowIcon />
               </button>
               <div className="flex items-center flex-1 cursor-pointer hover:opacity-80 transition">
                  {activeContact.id === GEMINI_BOT_ID ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white mr-3">
                       <RobotIcon />
                    </div>
                  ) : (
                   <img src={activeContact.avatar} alt="Avatar" className="w-10 h-10 rounded-full mr-3 object-cover border border-gray-100" />
                  )}
                 <div className="flex flex-col">
                   <span className="font-bold text-gray-900 text-base leading-tight">{activeContact.name}</span>
                   <span className="text-xs text-blue-500 font-medium">
                     {activeContact.id === GEMINI_BOT_ID ? 'AI Assistant' : 'Online'}
                   </span>
                 </div>
               </div>
               <div className="flex space-x-2 text-gray-500">
                  <button className="p-2 hover:bg-gray-100 rounded-full"><SearchIcon /></button>
               </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 z-0 no-scrollbar relative">
               {/* Encryption Notice */}
               {activeContact.id !== GEMINI_BOT_ID && (
                   <div className="flex justify-center mb-6 mt-2">
                       <div className="bg-[#517da2]/10 backdrop-blur-sm text-[#40688a] text-[11px] px-3 py-1.5 rounded-full flex items-center font-medium border border-[#517da2]/20 shadow-sm">
                           <LockIcon />
                           <span className="ml-1">End-to-end encrypted chat.</span>
                       </div>
                   </div>
               )}

              {(messages[activeContact.id] || []).map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`
                        max-w-[80%] md:max-w-[60%] rounded-lg px-3 py-1.5 relative shadow-sm text-[15px]
                        ${isMe ? 'bg-[#eeffde] text-black rounded-tr-none' : 'bg-white text-black rounded-tl-none'}
                      `}
                    >
                      <p className="whitespace-pre-wrap break-words leading-snug">{msg.text}</p>
                      <div className="flex items-center justify-end space-x-1 mt-1 opacity-60 select-none">
                         <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         {isMe && <CheckIcon double={msg.status === 'read'} read={msg.status === 'read'} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-2 md:p-3 flex items-end z-10 shrink-0 border-t border-gray-200">
               <button className="p-2 text-gray-500 hover:text-gray-700 transition rounded-full hover:bg-gray-100">
                  <AttachmentIcon />
               </button>
               <div className="flex-1 bg-gray-100 rounded-2xl mx-2 flex items-center">
                 <textarea
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyDown={(e) => {
                       if(e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           handleSendMessage();
                       }
                   }}
                   placeholder="Write a message..."
                   className="w-full bg-transparent max-h-32 min-h-[44px] py-3 px-4 outline-none resize-none text-gray-800 placeholder-gray-500 text-sm"
                   rows={1}
                 />
               </div>
               {inputText.trim() ? (
                   <button 
                     onClick={handleSendMessage}
                     className="p-3 text-[#517da2] hover:bg-blue-50 rounded-full transition duration-200 transform hover:scale-105 active:scale-95"
                   >
                      <SendIcon />
                   </button>
               ) : (
                   <button className="p-3 text-gray-500 hover:text-gray-700 transition rounded-full hover:bg-gray-100">
                       <MicIcon />
                   </button>
               )}
            </div>
          </>
        ) : (
          /* Empty State for Desktop */
          <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none z-10">
             <div className="bg-gray-200/50 p-6 rounded-full mb-4 animate-pulse">
                <span className="text-4xl opacity-50 block grayscale">💬</span>
             </div>
             <p className="font-medium bg-white/50 px-4 py-1 rounded-full text-sm">Select a chat to start messaging</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default App;