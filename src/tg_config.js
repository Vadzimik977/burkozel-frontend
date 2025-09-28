window.addEventListener('load', (event) => {
    const tg = window.Telegram.WebApp;
    tg.ready(); 
    tg.expand(); 
    // tg.disableVerticalSwipes();
    const userName = tg.initDataUnsafe.user.username || "vadi977";


    const ty = window.Telegram.WebApp.initData;
    console.log(ty)
    const userId = tg.initDataUnsafe.user?.id || 1;
    if (userId) {
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName);
        console.log("User ID сохранен:", userId);
    } else {
        console.error("User ID не найден в initDataUnsafe.");
    }
});