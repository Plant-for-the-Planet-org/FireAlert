import { memo } from 'react';
import type { FC } from 'react';
import styled from 'styled-components';

interface OtpValueContainerProps {
    value: string;
}

const StyledOtpValueContainer = styled.div`
  color: #252525;
  font-size: 24px;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
  white-space: nowrap;
  flex-direction: column;
`;

const OtpValueContainer: FC<OtpValueContainerProps> = memo(function OtpValueContainer({ value }) {
    return <StyledOtpValueContainer>{value}</StyledOtpValueContainer>;
});

export default OtpValueContainer;
