.class public Lph/gr8/calms/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# CALMS for Android: the CALMS site in a WebView. Links to other websites open in the phone's own apps,
# file pickers work (uploading papers), the back button goes back a page.

.field public picking:Landroid/webkit/ValueCallback;
.field public web:Landroid/webkit/WebView;

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 7
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
    const v1, -0xdbecf6
    invoke-virtual {p0}, Lph/gr8/calms/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    invoke-virtual {v0, v1}, Landroid/view/Window;->setStatusBarColor(I)V
    invoke-virtual {v0, v1}, Landroid/view/Window;->setNavigationBarColor(I)V
    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lph/gr8/calms/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V
    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v2
    const/4 v3, 0x1
    invoke-virtual {v2, v3}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v2, v3}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v2, v3}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V
    const/4 v3, 0x0
    invoke-virtual {v2, v3}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V
    invoke-virtual {v2}, Landroid/webkit/WebSettings;->getUserAgentString()Ljava/lang/String;
    move-result-object v3
    const-string v4, " CALMS-Android/0.1"
    invoke-virtual {v3, v4}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    invoke-virtual {v2, v3}, Landroid/webkit/WebSettings;->setUserAgentString(Ljava/lang/String;)V
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;
    move-result-object v2
    const/4 v3, 0x1
    invoke-virtual {v2, v3}, Landroid/webkit/CookieManager;->setAcceptCookie(Z)V
    new-instance v2, Lph/gr8/calms/MainActivity$1;
    invoke-direct {v2, p0}, Lph/gr8/calms/MainActivity$1;-><init>(Lph/gr8/calms/MainActivity;)V
    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V
    new-instance v2, Lph/gr8/calms/MainActivity$2;
    invoke-direct {v2, p0}, Lph/gr8/calms/MainActivity$2;-><init>(Lph/gr8/calms/MainActivity;)V
    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V
    new-instance v2, Lph/gr8/calms/MainActivity$3;
    invoke-direct {v2, p0}, Lph/gr8/calms/MainActivity$3;-><init>(Lph/gr8/calms/MainActivity;)V
    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setDownloadListener(Landroid/webkit/DownloadListener;)V
    invoke-virtual {p0, v0}, Lph/gr8/calms/MainActivity;->setContentView(Landroid/view/View;)V
    const-string v2, "https://calms-ww9l.onrender.com/index.html"
    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void
.end method

.method public open(Landroid/net/Uri;)V
    .registers 4
    :try_start_0
    new-instance v0, Landroid/content/Intent;
    const-string v1, "android.intent.action.VIEW"
    invoke-direct {v0, v1, p1}, Landroid/content/Intent;-><init>(Ljava/lang/String;Landroid/net/Uri;)V
    invoke-virtual {p0, v0}, Lph/gr8/calms/MainActivity;->startActivity(Landroid/content/Intent;)V
    :try_end_0
    .catch Ljava/lang/RuntimeException; {:try_start_0 .. :try_end_0} :catch_0
    return-void
    :catch_0
    move-exception v0
    return-void
.end method

.method protected onActivityResult(IILandroid/content/Intent;)V
    .registers 6
    const/4 v0, 0x7
    if-ne p1, v0, :cond_super
    iget-object v0, p0, Lph/gr8/calms/MainActivity;->picking:Landroid/webkit/ValueCallback;
    if-eqz v0, :cond_super
    invoke-static {p2, p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->parseResult(ILandroid/content/Intent;)[Landroid/net/Uri;
    move-result-object v1
    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    const/4 v1, 0x0
    iput-object v1, p0, Lph/gr8/calms/MainActivity;->picking:Landroid/webkit/ValueCallback;
    return-void
    :cond_super
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    return-void
.end method

.method public onBackPressed()V
    .registers 3
    iget-object v0, p0, Lph/gr8/calms/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :cond_super
    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v1
    if-eqz v1, :cond_super
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void
    :cond_super
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method

.method protected onResume()V
    .registers 2
    invoke-super {p0}, Landroid/app/Activity;->onResume()V
    iget-object v0, p0, Lph/gr8/calms/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :cond_end
    invoke-virtual {v0}, Landroid/webkit/WebView;->onResume()V
    :cond_end
    return-void
.end method

.method protected onPause()V
    .registers 2
    iget-object v0, p0, Lph/gr8/calms/MainActivity;->web:Landroid/webkit/WebView;
    if-eqz v0, :cond_flush
    invoke-virtual {v0}, Landroid/webkit/WebView;->onPause()V
    :cond_flush
    invoke-static {}, Landroid/webkit/CookieManager;->getInstance()Landroid/webkit/CookieManager;
    move-result-object v0
    invoke-virtual {v0}, Landroid/webkit/CookieManager;->flush()V
    invoke-super {p0}, Landroid/app/Activity;->onPause()V
    return-void
.end method
