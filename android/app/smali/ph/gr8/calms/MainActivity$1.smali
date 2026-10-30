.class final Lph/gr8/calms/MainActivity$1;
.super Landroid/webkit/WebViewClient;
.source "MainActivity.java"

.field final synthetic a:Lph/gr8/calms/MainActivity;

.method constructor <init>(Lph/gr8/calms/MainActivity;)V
    .registers 2
    iput-object p1, p0, Lph/gr8/calms/MainActivity$1;->a:Lph/gr8/calms/MainActivity;
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    return-void
.end method

# CALMS pages (https on the CALMS host) stay in the app; anything else opens in the phone's own app
.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Z
    .registers 7
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v1
    const-string v2, "calms-ww9l.onrender.com"
    invoke-virtual {v2, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v2
    if-eqz v2, :cond_out
    invoke-virtual {v0}, Landroid/net/Uri;->getScheme()Ljava/lang/String;
    move-result-object v1
    const-string v2, "https"
    invoke-virtual {v2, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v2
    if-eqz v2, :cond_out
    const/4 v3, 0x0
    return v3
    :cond_out
    iget-object v1, p0, Lph/gr8/calms/MainActivity$1;->a:Lph/gr8/calms/MainActivity;
    invoke-virtual {v1, v0}, Lph/gr8/calms/MainActivity;->open(Landroid/net/Uri;)V
    const/4 v3, 0x1
    return v3
.end method
