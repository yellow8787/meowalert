interface Props {
  params: Promise<{ id: string }>;
}

export default async function CatDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="text-center space-y-3">
        <div className="text-4xl mb-3">🐱</div>
        <h1 className="text-xl font-bold">貓咪詳情</h1>
        <p className="text-sm text-muted-foreground">ID: {id}</p>
        <p className="text-xs text-muted-foreground mt-4">Milestone 3 實作中</p>
      </div>
    </div>
  );
}
