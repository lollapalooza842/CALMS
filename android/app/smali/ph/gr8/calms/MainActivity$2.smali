.class final Lph/gr8/calms/MainActivity$2;
.super Landroid/webkit/WebChromeClient;
.source "MainActivity.java"

.field final synthetic a:Lph/gr8/calms/MainActivity;

.method constructor <init>(Lph/gr8/calms/MainActivity;)V
    .registers 2
    iput-object p1, p0, Lph/gr8/calms/MainActivity$2;->a:Lph/gr8/calms/MainActivity;
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    return-void
.end method

# the page asks for a file (uploading a paper): the phone's own picker, the answer handed back in onActivityResult
.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 7
    iget-object v0, p0, Lph/gr8/calms/MainActivity$2;->a:Lph/gr8/calms/MainActivity;
    iget-object v1, v0, Lph/gr8/calms/MainActivity;->picking:Landroid/webkit/ValueCallback;
    if-eqz v1, :cond_set
    const/4 v2, 0x0
    invoke-interface {v1, v2}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :cond_set
    iput-object p2, v0, Lph/gr8/calms/MainActivity;->picking:Landroid/webkit/ValueCallback;
    :try_start_0
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v1
    const/4 v2, 0x7
    invoke-virtual {v0, v1, v2}, Lph/gr8/calms/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_0
    .catch Ljava/lang/RuntimeException; {:try_start_0 .. :try_end_0} :catch_0
    const/4 v2, 0x1
    return v2
    :catch_0
    move-exception v1
    const/4 v2, 0x0
    iput-object v2, v0, Lph/gr8/calms/MainActivity;->picking:Landroid/webkit/ValueCallback;
    return v2
.end method
