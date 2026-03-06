"use client";

import { useState, useEffect } from "react";
import { Film, Tv, Trash2, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { StorageCards } from "@/components/library/storage-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { MediaFile } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/formatters";
import { useStorage } from "@/hooks/use-storage";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function LibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const { storage } = useStorage();

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const category = tab === "all" ? undefined : tab;
      const data = search
        ? await api.searchLibrary(search)
        : await api.getLibrary(category);
      setFiles(data);
    } catch {
      toast.error("Failed to load library");
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFiles(); }, [tab, search]);

  const handleDelete = async (file: MediaFile) => {
    try {
      await api.deleteMedia(file.path);
      toast.success(`Deleted: ${file.name}`);
      fetchFiles();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <h1 className="text-lg font-semibold">Library</h1>

        <StorageCards storage={storage} />

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setSearch(""); }}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="movies" className="flex-1">Movies</TabsTrigger>
            <TabsTrigger value="tv-shows" className="flex-1">TV Shows</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        )}

        {!loading && (
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.path}>
                <CardContent className="p-3 flex items-center gap-3">
                  {file.category === "movies" ? (
                    <Film className="h-5 w-5 text-blue-400 shrink-0" />
                  ) : (
                    <Tv className="h-5 w-5 text-purple-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{formatBytes(file.size)}</Badge>
                      <span className="text-[10px] text-muted-foreground">{formatDate(file.modTime)}</span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete &quot;{file.name}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(file)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
            {files.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">No media files found</p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
