import { memo } from 'react';
import type { FC } from 'react';
import OtpValueContainer from './OtpValueContainer';
import styled from 'styled-components';

const OtpBoxWrapper = styled.div`
    padding: 16px;
    margin: 5px;
    outline: solid 1px #e86f56;
    outline-offset: -1px;
    border-radius: 8px;
    background-color: #fff;
    overflow: hidden;
    box-shadow: 0px 4px 8px 0px #f5822929;

    @media (max-width: 415px) {
        padding: 10px;
        margin: 3px;
    }
`;

interface OtpBoxProps {
    frames: string[];
}

const OtpBox: FC<OtpBoxProps> = memo(function OtpBox({ frames }) {
    return (
        <>
            {frames.map((value, index) => (
                <OtpBoxWrapper key={index}>
                    <OtpValueContainer value={value} />
                </OtpBoxWrapper>
            ))}
        </>
    );
});

export default OtpBox;
