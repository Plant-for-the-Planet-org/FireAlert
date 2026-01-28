import type {GetServerSidePropsContext} from 'next';
import {useState} from 'react';
import {UnsubscribePage as UnsubscribePageComponent} from '../../Components/UnsubscribePage/UnsubscribePage';
import {api} from '../../utils/api';

const UnsubscribePage = UnsubscribePageComponent as any;

export const getServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const token = context.query.token as string;

  return {
    props: {
      token,
    },
  };
};

interface PageProps {
  token: string;
}

export default function Page({token}: PageProps) {
  const validateMutation = api.unsubscribe.validateToken.useQuery(
    {token},
    {enabled: !!token},
  );
  const processMutation = api.unsubscribe.processUnsubscribe.useMutation();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleUnsubscribe = async () => {
    if (!token) return;

    setIsProcessing(true);
    try {
      const response = await processMutation.mutateAsync({token});
      setResult({
        success: response.success,
        message: response.message,
      });
      setIsProcessed(true);
    } catch (error) {
      setResult({
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
      });
      setIsProcessed(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <UnsubscribePage
      token={token}
      validation={validateMutation.data}
      isValidating={validateMutation.isLoading}
      validationError={(validateMutation.error as Error | null) ?? null}
      onUnsubscribe={handleUnsubscribe}
      isProcessing={isProcessing}
      isProcessed={isProcessed}
      result={result}
    />
  );
}
