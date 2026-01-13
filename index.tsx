import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// LocalStorage Helper
const getStorage = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setStorage = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

// App Engine
const app = {
    currentUser: JSON.parse(localStorage.getItem('dc_session') || 'null'),
    
    // AUTH LOGIC
    signup() {
        const u = (document.getElementById('signup-user') as HTMLInputElement).value;
        const p = (document.getElementById('signup-pass') as HTMLInputElement).value;
        if(!u || !p) return alert("Fill in everything!");
        
        let users = getStorage('dc_users');
        if(users.find((x: any) => x.u === u)) return alert("Username taken!");
        
        users.push({ u, p, fits: [], wishlist: [], points: 10 });
        setStorage('dc_users', users);
        alert("Registered! You can login now.");
        this.toggleAuth('login');
    },

    login() {
        const u = (document.getElementById('login-user') as HTMLInputElement).value;
        const p = (document.getElementById('login-pass') as HTMLInputElement).value;
        let users = getStorage('dc_users');
        const user = users.find((x: any) => x.u === u && x.p === p);
        
        if(user) {
            localStorage.setItem('dc_session', JSON.stringify(user));
            location.reload();
        } else {
            alert("Wrong credentials!");
        }
    },

    logout() {
        localStorage.removeItem('dc_session');
        location.href = 'index.html';
    },

    toggleAuth(type: string) {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        if(loginForm && signupForm) {
            loginForm.style.display = type === 'login' ? 'block' : 'none';
            signupForm.style.display = type === 'signup' ? 'block' : 'none';
        }
    },

    checkProtection() {
        const path = window.location.pathname;
        const protectedPages = ['closet.html', 'lex.html', 'wishlist.html', 'leaderboard.html'];
        const isProtected = protectedPages.some(p => path.includes(p));
        
        if(isProtected && !this.currentUser) {
            alert("Members Only! Redirecting...");
            location.href = 'index.html';
        }
    },

    // CLOSET LOGIC
    uploadFit() {
        const fileInput = document.getElementById('fit-upload') as HTMLInputElement;
        if(!fileInput.files?.length) return alert("Select an image first!");
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            let users = getStorage('dc_users');
            const idx = users.findIndex((x: any) => x.u === this.currentUser.u);
            if(idx > -1) {
                users[idx].fits.push(base64);
                users[idx].points += 50; // Points for uploading
                setStorage('dc_users', users);
                localStorage.setItem('dc_session', JSON.stringify(users[idx]));
                alert("Fit Uploaded Locally!");
                location.reload();
            }
        };
        reader.readAsDataURL(file);
    },

    renderCloset() {
        const container = document.getElementById('fit-container');
        if(!container) return;
        
        // Render current user fits
        if(this.currentUser && this.currentUser.fits) {
            this.currentUser.fits.forEach((f: string) => {
                const card = document.createElement('div');
                card.className = 'fit-card';
                card.innerHTML = `<img src="${f}"><p style="font-size: 9px; margin: 5px 0;">~* My Selfie *~</p>`;
                container.appendChild(card);
            });
        }
    },

    // WISHLIST LOGIC
    addWish() {
        const item = (document.getElementById('wish-item') as HTMLInputElement).value;
        const price = (document.getElementById('wish-price') as HTMLInputElement).value;
        if(!item) return;

        let users = getStorage('dc_users');
        const idx = users.findIndex((x: any) => x.u === this.currentUser.u);
        if(idx > -1) {
            users[idx].wishlist.push({ item, price });
            setStorage('dc_users', users);
            localStorage.setItem('dc_session', JSON.stringify(users[idx]));
            location.reload();
        }
    },

    removeWish(idxToRemove: number) {
        let users = getStorage('dc_users');
        const uIdx = users.findIndex((x: any) => x.u === this.currentUser.u);
        if(uIdx > -1) {
            users[uIdx].wishlist.splice(idxToRemove, 1);
            setStorage('dc_users', users);
            localStorage.setItem('dc_session', JSON.stringify(users[uIdx]));
            location.reload();
        }
    },

    renderWishlist() {
        const body = document.getElementById('wish-list-body');
        if(!body || !this.currentUser) return;
        
        this.currentUser.wishlist.forEach((w: any, i: number) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${w.item}</td><td>${w.price}</td><td><button onclick="app.removeWish(${i})">X</button></td>`;
            body.appendChild(tr);
        });
    },

    // LEADERBOARD
    renderLeaderboard() {
        const body = document.getElementById('leaderboard-data')?.querySelector('tbody');
        if(!body) return;
        
        let users = getStorage('dc_users');
        // Sort by points
        users.sort((a: any, b: any) => b.points - a.points);
        
        users.forEach((u: any, i: number) => {
            const tr = document.createElement('tr');
            if(i === 0) tr.className = 'rank-1';
            tr.innerHTML = `<td>${i+1}</td><td>${u.u}</td><td>${u.fits.length}</td><td>${u.points}</td>`;
            body.appendChild(tr);
        });
    },

    // AIM CHAT LOGIC
    async sendMessage() {
        const input = document.getElementById('chat-msg') as HTMLInputElement;
        const windowEl = document.getElementById('chat-window');
        const text = input.value.trim();
        if(!text) return;

        // User message
        const p = document.createElement('p');
        p.innerHTML = `<span style="color: blue; font-weight: bold;">Me:</span> ${text}`;
        windowEl?.appendChild(p);
        input.value = '';

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: text,
                config: {
                    systemInstruction: "You are Lexi, a 19-year-old fashion stylist from 2006. Use slang like omg, totally, fetch, <3, rawr. You love Juicy Couture and RAZR phones. Keep responses short and high-energy like an AIM chat.",
                }
            });
            const reply = document.createElement('p');
            reply.innerHTML = `<span style="color: red; font-weight: bold;">Lexi:</span> ${response.text}`;
            windowEl?.appendChild(reply);
            windowEl?.scrollTo(0, windowEl.scrollHeight);
        } catch (e) {
            console.error(e);
        }
    },

    init() {
        this.checkProtection();
        
        // Handle Header/Sidebar Sync
        const hitCount = document.getElementById('hit-count');
        if(hitCount) hitCount.innerText = (5821 + Math.floor(Math.random() * 100)).toString();

        const info = document.getElementById('user-info');
        const authSec = document.getElementById('auth-section');
        const welcomeSec = document.getElementById('welcome-section');
        const displayUser = document.getElementById('display-user');

        if(this.currentUser) {
            if(info) info.innerHTML = `Logged in: <b>${this.currentUser.u}</b><br>Pts: ${this.currentUser.points}`;
            if(authSec) authSec.style.display = 'none';
            if(welcomeSec) {
                welcomeSec.style.display = 'block';
                if(displayUser) displayUser.innerText = this.currentUser.u;
            }
            if(document.getElementById('welcome-message')) document.getElementById('welcome-message')!.style.display = 'none';
        } else {
            if(authSec) authSec.style.display = 'block';
        }

        this.renderCloset();
        this.renderWishlist();
        this.renderLeaderboard();
    }
};

// Global expose
(window as any).app = app;

// Run on load
window.onload = () => app.init();
