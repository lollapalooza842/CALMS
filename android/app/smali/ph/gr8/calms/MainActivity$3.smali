.class final Lph/gr8/calms/MainActivity$3;
.super Ljava/lang/Object;
.source "MainActivity.java"

.implements Landroid/webkit/DownloadListener;

.field final synthetic a:Lph/gr8/calms/MainActivity;

.method constructor <init>(Lph/gr8/calms/MainActivity;)V
    .registers 2
    iput-object p1, p0, Lph/gr8/calms/MainActivity$3;->a:Lph/gr8/calms/MainActivity;
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    return-void
.end method

# a file to download (a form, a guide): handed to the phone's browser
.method public onDownloadStart(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;J)V
    .registers 9
    iget-object v0, p0, Lph/gr8/calms/MainActivity$3;->a:Lph/gr8/calms/MainActivity;
    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v1
    invoke-virtual {v0, v1}, Lph/gr8/calms/MainActivity;->open(Landroid/net/Uri;)V
    return-void
.end method
